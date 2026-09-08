import { defaultSnapshot, type Reflection, type Settings, type StorageSnapshot } from './types';
import { migrate, reflection, settingsPatch, snapshot } from './validation';
import { applyCommand, boundary, observe, reconcile, checkTarget, setExtensionPaused, type Boundary, type Observation, type Observer, type SessionMutation } from '../session/model';

export const STORAGE_KEY = 'chrysalis.extension.v1';
export interface StorageAdapter {
  read(): Promise<unknown>;
  write(value: StorageSnapshot, intent?: 'history' | 'all'): Promise<void>;
}
export class ConflictError extends Error {}
// The worker is the only writer. Read from disk inside the queue on every operation;
// the queue orders live requests, but is never the source of persisted state.
export function createStore(adapter: StorageAdapter, environment?: { now(): number; epoch(): Promise<string> }) {
  let queue = Promise.resolve();
  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = queue.then(operation);
    queue = next.then(() => undefined, () => undefined);
    return next;
  }
  async function read(now = environment?.now() ?? Date.now()): Promise<StorageSnapshot> {
    const value = await adapter.read();
    const state = value === undefined ? defaultSnapshot() : migrate(value, now);
    if (environment) reconcile(state, now, await environment.epoch());
    if (value !== undefined && JSON.stringify(value) !== JSON.stringify(state)) {
      state.sequence++; await adapter.write(state);
    }
    return state;
  }
  function transaction(operation: (state: StorageSnapshot, now: number) => Promise<void> | void, at?: number, intent?: 'history' | 'all') {
    // Timestamp receipt, not queue completion: slow storage must not shift a
    // pause/focus boundary later and credit time after the user has left.
    const now = at ?? environment?.now() ?? Date.now();
    return serialize(async () => {
      const state = await read(now);
      const before = JSON.stringify(state);
      await operation(state, now);
      if (intent || JSON.stringify(state) !== before) {
        state.sequence++;
        if (!snapshot(state)) throw new Error('Cannot save invalid session data.');
        await adapter.write(state, intent);
      }
      return state;
    });
  }
  return {
    exclusive: serialize,
    read: () => serialize(() => read()),
    initialize: () => serialize(async () => {
      const existing = await adapter.read();
      if (existing === undefined) await adapter.write(await read());
      else await read();
    }),
    updateSettings: (patch: Partial<Settings>, expectedRevision: number) => transaction((state, now) => {
      if (!settingsPatch(patch)) throw new Error('Invalid settings.');
      if (patch.defaultTargetMs === null) throw new Error('Choose a default time target from 1 to 1440 minutes.');
      if (expectedRevision !== state.revision) throw new ConflictError('Settings changed in another window. Review the latest settings and try again.');
      if (patch.extensionPaused !== undefined) setExtensionPaused(state, patch.extensionPaused, now);
      state.settings = { ...state.settings, ...patch }; state.revision++;
      if (patch.checkpointsEnabled === false && state.currentSession.phase === 'checkpoint') { state.currentSession.phase = 'active'; state.sessionRevision++; }
      checkTarget(state);
    }),
    deleteData: (scope: 'history' | 'all', expectedRevision: number, expectedSessionRevision: number, expectedHistoryRevision?: number) => transaction(state => {
      if (state.revision !== expectedRevision || state.sessionRevision !== expectedSessionRevision || (expectedHistoryRevision !== undefined && state.historyRevision !== expectedHistoryRevision)) throw new ConflictError('Chrysalis changed in another view. Review the latest state before deleting.');
      if (scope === 'all') {
        // Keep monotonic, non-personal counters to reject old in-flight writes.
        const next = defaultSnapshot();
        next.revision = state.revision + 1; next.sessionRevision = state.sessionRevision + 1;
        next.sequence = state.sequence; next.historyRevision = state.historyRevision + 1;
        Object.assign(state, next);
      } else {
        state.completedSessions = []; state.receipts = []; state.sessionRevision++; state.historyRevision++;
        if (state.currentSession.phase === 'finished') state.currentSession = { phase: 'idle' };
      }
    }, undefined, scope),
    offerReflection: (sessionId: string) => serialize(async () => {
      const state = await read();
      const summary = state.completedSessions.find(s => s.id === sessionId);
      if (!summary || summary.reflectionPrompted || state.currentSession.phase !== 'finished' || state.currentSession.id !== sessionId) return { snapshot: state, offered: false };
      summary.reflectionPrompted = true; state.historyRevision++; state.sequence++;
      await adapter.write(state);
      return { snapshot: state, offered: true };
    }),
    changeHistory: (sessionId: string, expectedRevision: number, change: { action: 'delete' } | { action: 'reflect'; reflection: Reflection | null }) => transaction(state => {
      if (state.historyRevision !== expectedRevision) throw new ConflictError('History changed in another view. Review the latest record and try again.');
      const summary = state.completedSessions.find(s => s.id === sessionId);
      if (!summary) throw new ConflictError('This session is no longer in your history.');
      if (change.action === 'delete') {
        state.completedSessions = state.completedSessions.filter(s => s.id !== sessionId);
        state.receipts = []; state.sessionRevision++;
        if (state.currentSession.phase === 'finished' && state.currentSession.id === sessionId) state.currentSession = { phase: 'idle' };
      } else {
        if (!reflection(change.reflection)) throw new Error('Invalid reflection.');
        summary.reflection = change.reflection === null ? null : { answer: change.reflection.answer, note: change.reflection.note?.trim() || null };
        if (summary.reflection?.answer === null && summary.reflection.note === null) summary.reflection = null;
        summary.reflectionPrompted = true;
      }
      state.historyRevision++;
    }),
    execute: (mutation: SessionMutation) => transaction((state, now) => applyCommand(state, mutation, now)),
    observe: (sample: Observation, observer: Observer, eligible: () => Promise<boolean>) =>
      transaction(async (state, now) => {
        const allowed = await eligible();
        // Delayed queue/API responses are not evidence of continuous activity.
        const processedAt = environment?.now() ?? now;
        if (processedAt - now > 1000) {
          reconcile(state, processedAt, state.timing.browserEpoch ?? '');
          state.timing.anchor = null;
          return;
        }
        observe(state, sample, observer, allowed, now);
      }),
    boundary: (event: Boundary, at?: number) => transaction((state, now) => boundary(state, event, now), at),
  };
}
export type Store = ReturnType<typeof createStore>;
