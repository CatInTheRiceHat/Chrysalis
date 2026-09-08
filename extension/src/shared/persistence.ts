import { createEncryption, decrypt, derive, encrypt, envelope, type Envelope } from './crypto';
import { defaultSnapshot, HISTORY_LIMIT, type CompletedSessionSummary, type CurrentSession, type StorageSnapshot } from './types';
import { migrate, settings, snapshot } from './validation';
import { STORAGE_KEY, type StorageAdapter } from './storage';

export const PREFERENCES_KEY = 'chrysalis.preferences.v1';
export const MEMORY_KEY = 'chrysalis.history-memory.v1';
export interface Area { get(keys: string[]): Promise<Record<string, unknown>>; set(values: Record<string, unknown>): Promise<void> }
interface Durable { format: 'chrysalis-history-1'; resetToken: string; resetScope: 'none' | 'history' | 'all'; vault: Envelope | null }
interface Payload { sessions: CompletedSessionSummary[]; archivedSession: CurrentSession }
interface Memory { resetToken: string | null; rawKey: string | null; salt: string | null; archivedSession: CurrentSession; saveError: boolean }
export interface HistoryStatus { enabled: boolean; unlocked: boolean; legacyPending: boolean; legacyReadable: boolean; saveError: boolean; archivedSession: CurrentSession }
export type HistoryAction = 'status' | 'enable' | 'unlock' | 'lock' | 'retry' | 'migrate-encrypt' | 'migrate-delete';
const emptyMemory = (): Memory => ({ resetToken: null, rawKey: null, salt: null, archivedSession: { phase: 'idle' }, saveError: false });
const durable = (v: unknown): v is Durable => !!v && typeof v === 'object' && (v as Durable).format === 'chrysalis-history-1' &&
  typeof (v as Durable).resetToken === 'string' && ['none', 'history', 'all'].includes((v as Durable).resetScope) && ((v as Durable).vault === null || envelope((v as Durable).vault));
function payload(v: unknown): v is Payload {
  if (!v || typeof v !== 'object' || Object.keys(v).sort().join() !== 'archivedSession,sessions') return false;
  const p = v as Payload;
  return snapshot({ ...defaultSnapshot(), completedSessions: p.sessions, currentSession: p.archivedSession });
}
function merge(old: CompletedSessionSummary[], recent: CompletedSessionSummary[]) {
  return [...new Map([...old, ...recent].map(s => [s.id, s])).values()].sort((a,b) => a.finishedAt - b.finishedAt).slice(-HISTORY_LIMIT);
}
function cleared(state: StorageSnapshot, scope: 'history' | 'all') {
  const next = scope === 'all' ? defaultSnapshot() : structuredClone(state);
  next.revision = state.revision + 1; next.sessionRevision = state.sessionRevision + 1;
  next.historyRevision = state.historyRevision + 1; next.sequence = state.sequence + 1;
  next.completedSessions = []; next.receipts = [];
  if (scope === 'all' || next.currentSession.phase === 'finished') next.currentSession = { phase: 'idle' };
  return next;
}
// All methods execute inside the store's single queue, including vault commands.
export function createPersistence(local: Area, session: Area) {
  async function readParts() {
    const disk = await local.get([STORAGE_KEY, PREFERENCES_KEY]);
    const ram = await session.get([STORAGE_KEY, MEMORY_KEY]);
    const root = disk[STORAGE_KEY];
    let state: StorageSnapshot;
    if (ram[STORAGE_KEY] !== undefined) state = migrate(ram[STORAGE_KEY]);
    else {
      state = defaultSnapshot();
      if (settings(disk[PREFERENCES_KEY])) state.settings = disk[PREFERENCES_KEY];
      else if (root !== undefined && !durable(root)) { try { state.settings = migrate(root).settings; } catch { /* Old unknown records stay untouched. */ } }
    }
    let memory = (ram[MEMORY_KEY] ?? emptyMemory()) as Memory;
    // A durable deletion marker wins even if the following RAM write failed or the worker died.
    if (durable(root) && memory.resetToken !== root.resetToken) {
      if (root.resetScope !== 'none') state = cleared(state, root.resetScope);
      memory = { ...emptyMemory(), resetToken: root.resetToken };
    }
    if (settings(disk[PREFERENCES_KEY]) && JSON.stringify(state.settings) !== JSON.stringify(disk[PREFERENCES_KEY])) {
      state.settings = disk[PREFERENCES_KEY]; state.revision++; state.sequence++;
    }
    // Initialize/reset in one memory operation; never write activity to disk.
    if (JSON.stringify(state) !== JSON.stringify(ram[STORAGE_KEY]) || JSON.stringify(memory) !== JSON.stringify(ram[MEMORY_KEY]))
      await session.set({ [STORAGE_KEY]: state, [MEMORY_KEY]: memory });
    return { root, state, memory };
  }
  async function saveHistory(state: StorageSnapshot, memory: Memory, root: Durable) {
    if (!memory.rawKey || !memory.salt || !root.vault) return;
    const value: Payload = { sessions: state.completedSessions, archivedSession: memory.archivedSession };
    try {
      const next = { ...root, vault: await encrypt(value, memory.rawKey, memory.salt) };
      await local.set({ [STORAGE_KEY]: next });
      memory.saveError = false;
    } catch { memory.saveError = true; }
    // Session remains committed even if durable history fails: viewing is independent.
    await session.set({ [MEMORY_KEY]: memory });
  }
  const adapter: StorageAdapter = {
    async read() { return (await readParts()).state; },
    async write(state, intent) {
      const { root, state: before, memory } = await readParts();
      if (intent) {
        if (root !== undefined && !durable(root)) throw new Error('Resolve the earlier-version data choice in history first.');
        const next: Durable = { format: 'chrysalis-history-1', resetToken: crypto.randomUUID(), resetScope: intent === 'all' ? 'all' : 'history', vault: null };
        await local.set({ [STORAGE_KEY]: next, [PREFERENCES_KEY]: state.settings });
        await session.set({ [STORAGE_KEY]: state, [MEMORY_KEY]: { ...emptyMemory(), resetToken: next.resetToken }, ...(intent === 'all' ? { 'chrysalis.visit': null, 'chrysalis.browser-epoch': null } : {}) });
        return;
      }
      if (JSON.stringify(before.settings) !== JSON.stringify(state.settings)) await local.set({ [PREFERENCES_KEY]: state.settings });
      const changedHistory = durable(root) && !!memory.rawKey && JSON.stringify(before.completedSessions) !== JSON.stringify(state.completedSessions);
      // Mark dirty with the same memory commit as the edit. If disk and subsequent
      // metadata writes both fail, a later lock must still refuse to lose the edit.
      if (changedHistory) memory.saveError = true;
      await session.set({ [STORAGE_KEY]: state, ...(changedHistory ? { [MEMORY_KEY]: memory } : {}) });
      if (changedHistory && durable(root)) await saveHistory(state, memory, root);
    },
  };
  async function history(action: HistoryAction, password = ''): Promise<{ status: HistoryStatus; snapshot: StorageSnapshot }> {
    let { root, state, memory } = await readParts();
    const legacy = root !== undefined && !durable(root);
    let earlier: StorageSnapshot | null = null;
    if (legacy) { try { earlier = migrate(root); } catch { /* Deletion remains an explicit option. */ } }
    if (action === 'migrate-delete') {
      if (!legacy) throw new Error('Earlier-version data changed. Refresh before choosing.');
      // This replaces the sole old plaintext record atomically, not an untracked backup copy.
      const next: Durable = { format: 'chrysalis-history-1', resetToken: crypto.randomUUID(), resetScope: 'none', vault: null };
      await local.set({ [STORAGE_KEY]: next, [PREFERENCES_KEY]: state.settings });
      memory = { ...emptyMemory(), resetToken: next.resetToken }; root = next;
      await session.set({ [MEMORY_KEY]: memory });
    } else if (action === 'enable' || action === 'migrate-encrypt') {
      if (action === 'enable' && (legacy || (durable(root) && root.vault))) throw new Error('History already exists. Unlock it or resolve the earlier-version data.');
      if (action === 'migrate-encrypt' && (!legacy || !earlier)) throw new Error('Earlier data cannot be read safely; it was preserved.');
      const value: Payload = { sessions: merge(earlier?.completedSessions ?? [], state.completedSessions), archivedSession: earlier?.currentSession.phase !== 'finished' ? earlier?.currentSession ?? { phase: 'idle' } : { phase: 'idle' } };
      const { raw, encrypted } = await createEncryption(password, value);
      const next: Durable = { format: 'chrysalis-history-1', resetToken: crypto.randomUUID(), resetScope: 'none', vault: encrypted };
      await local.set({ [STORAGE_KEY]: next, [PREFERENCES_KEY]: state.settings });
      const check = (await local.get([STORAGE_KEY]))[STORAGE_KEY];
      if (!durable(check) || check.resetToken !== next.resetToken || check.resetScope !== next.resetScope || !check.vault || !next.vault || (Object.keys(next.vault) as (keyof Envelope)[]).some(key => check.vault![key] !== next.vault![key])) throw new Error('Encrypted write could not be confirmed. Reopen history before retrying.');
      root = next; memory = { resetToken: next.resetToken, rawKey: raw, salt: encrypted.salt, archivedSession: value.archivedSession, saveError: false };
      state.completedSessions = value.sessions; state.historyRevision++; state.sequence++;
      await session.set({ [STORAGE_KEY]: state, [MEMORY_KEY]: memory });
    } else if (action === 'unlock') {
      if (!durable(root) || !root.vault) throw new Error('No supported encrypted history to unlock.');
      let value: unknown, raw: string;
      try { raw = await derive(password, root.vault.salt); value = await decrypt(root.vault, raw); }
      catch { throw new Error('History could not be unlocked. Check the password; damaged data is left unchanged.'); }
      if (!payload(value)) throw new Error('Unsupported saved history. It was preserved.');
      memory = { resetToken: root.resetToken, rawKey: raw, salt: root.vault.salt, archivedSession: value.archivedSession, saveError: true };
      state.completedSessions = merge(value.sessions, state.completedSessions); state.historyRevision++; state.sequence++;
      await session.set({ [STORAGE_KEY]: state, [MEMORY_KEY]: memory });
      await saveHistory(state, memory, root);
    } else if (action === 'lock') {
      if (memory.saveError) throw new Error('History has unsaved changes. Retry saving or delete history before locking.');
      if (memory.rawKey) {
        state.completedSessions = []; state.receipts = []; state.historyRevision++; state.sessionRevision++; state.sequence++;
        if (state.currentSession.phase === 'finished') state.currentSession = { phase: 'idle' };
        memory = { ...emptyMemory(), resetToken: memory.resetToken };
        await session.set({ [STORAGE_KEY]: state, [MEMORY_KEY]: memory });
      }
    } else if (action === 'retry' && durable(root)) await saveHistory(state, memory, root);
    return { snapshot: state, status: {
      enabled: durable(root) && root.vault !== null, unlocked: !!memory.rawKey,
      legacyPending: root !== undefined && !durable(root), legacyReadable: !!earlier,
      saveError: memory.saveError, archivedSession: memory.rawKey ? memory.archivedSession : { phase: 'idle' },
    } };
  }
  return { adapter, history };
}
