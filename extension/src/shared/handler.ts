import type { HistoryAction, HistoryStatus } from './persistence';
import type { StorageSnapshot } from './types';
import { parseRequest, senderRole, type Reply } from './protocol';
import { ConflictError, type Store } from './storage';
import { SessionError, StaleSessionError } from '../session/model';
import { sessionDisplay } from './types';

export function createHandler(store: Store, extensionId: string, version: string,
  isForeground: (sender: chrome.runtime.MessageSender) => Promise<boolean> = async () => false,
  openPage: (page: 'session' | 'edit' | 'settings' | 'viewing' | 'history') => Promise<void> = async () => { throw new Error('Page opening unavailable'); },
  prompt: (foreground: () => Promise<boolean>) => Promise<'intro' | 'checkpoint' | null> = async () => null,
  vault?: (action: HistoryAction, password?: string) => Promise<{ status: HistoryStatus; snapshot: StorageSnapshot }>) {
  return async (value: unknown, sender: chrome.runtime.MessageSender): Promise<Reply> => {
    const role = senderRole(sender, extensionId);
    if (!role) return { ok: false, code: 'FORBIDDEN', error: 'This sender is not allowed.' };
    const request = parseRequest(value);
    if (!request) return { ok: false, code: 'INVALID', error: 'Invalid Chrysalis message.' };
    if (role === 'content' && !['PROMPT', 'PING', 'GET_SETTINGS', 'GET_DISPLAY', 'OBSERVE', 'SESSION_CONTROL', 'OPEN_PAGE'].includes(request.type)) {
      return { ok: false, code: 'FORBIDDEN', error: 'Only Chrysalis pages can change settings or read session data.' };
    }
    try {
      switch (request.type) {
        case 'HISTORY_VAULT': {
          if (!vault) throw new Error('History storage unavailable.');
          try { return { ok: true, type: 'VAULT', ...await vault(request.action, request.password) }; }
          catch (error) { return { ok: false, code: 'STORAGE', error: error instanceof Error ? error.message : 'History storage failed. Data was not reset.' }; }
        }
        case 'PROMPT': {
          if (role !== 'content' || !sender.documentId || (sender.documentLifecycle && sender.documentLifecycle !== 'active')) return { ok: false, code: 'FORBIDDEN', error: 'An active YouTube document is required.' };
          return { ok: true, type: 'PROMPT', prompt: await prompt(() => isForeground(sender)) };
        }
        case 'OFFER_REFLECTION': return { ok: true, type: 'REFLECTION_OFFER', ...await store.offerReflection(request.sessionId) };
        case 'HISTORY': return { ok: true, type: 'SNAPSHOT', snapshot: await store.changeHistory(request.sessionId, request.expectedRevision, request.change) };
        case 'OPEN_PAGE': await openPage(request.page); return { ok: true, type: 'OPENED' };
        case 'DELETE_DATA': return { ok: true, type: 'SNAPSHOT', snapshot: await store.deleteData(request.scope, request.expectedRevision, request.expectedSessionRevision, request.expectedHistoryRevision) };
        case 'SESSION_CONTROL': {
          const state = await store.execute(request.mutation);
          return { ok: true, type: 'DISPLAY', settings: state.settings, session: sessionDisplay(state), sequence: state.sequence };
        }
        case 'PING': return { ok: true, type: 'PONG', version };
        case 'GET_SETTINGS': {
          const state = await store.read();
          return { ok: true, type: 'SETTINGS', settings: state.settings, revision: state.revision };
        }
        case 'GET_SNAPSHOT': return { ok: true, type: 'SNAPSHOT', snapshot: await store.read() };
        case 'GET_DISPLAY': {
          const state = await store.read();
          return { ok: true, type: 'DISPLAY', settings: state.settings, session: sessionDisplay(state), sequence: state.sequence };
        }
        case 'SESSION': return { ok: true, type: 'SNAPSHOT', snapshot: await store.execute(request.mutation) };
        case 'OBSERVE': {
          if (role !== 'content' || sender.tab?.id === undefined || sender.tab.windowId === undefined || !sender.documentId ||
              (sender.documentLifecycle && sender.documentLifecycle !== 'active')) {
            return { ok: false, code: 'FORBIDDEN', error: 'An active top-frame YouTube document is required.' };
          }
          const state = await store.observe(request.sample, { tabId: sender.tab.id, windowId: sender.tab.windowId, documentId: sender.documentId }, () => isForeground(sender));
          return { ok: true, type: 'DISPLAY', settings: state.settings, session: sessionDisplay(state), sequence: state.sequence };
        }
        case 'UPDATE_SETTINGS': {
          const state = await store.updateSettings(request.patch, request.expectedRevision);
          return { ok: true, type: 'SETTINGS', settings: state.settings, revision: state.revision };
        }
      }
    } catch (error) {
      return error instanceof ConflictError || error instanceof StaleSessionError
        ? { ok: false, code: 'CONFLICT', error: error.message }
        : error instanceof SessionError ? { ok: false, code: 'INVALID', error: error.message }
        : { ok: false, code: 'STORAGE', error: 'Changes could not be read or saved. Existing data was not reset. Refresh and try again.' };
    }
  };
}
