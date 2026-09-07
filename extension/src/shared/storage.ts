import { defaultSnapshot, type Settings, type StorageSnapshot } from './types';
import { migrate, settingsPatch, snapshot } from './validation';
import { applyCommand, boundary, observe, reconcile, checkTarget, type Boundary, type Observation, type Observer, type SessionMutation } from '../session/model';

export const STORAGE_KEY = 'chrysalis.extension.v1';
export interface StorageAdapter {
  read(): Promise<unknown>;
  write(value: StorageSnapshot): Promise<void>;
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
    const state = value === undefined ? defaultSnapshot() : migrate(value);
    if (environment) reconcile(state, now, await environment.epoch());
    if (value !== undefined && JSON.stringify(value) !== JSON.stringify(state)) {
      state.sequence++; await adapter.write(state);
    }
    return state;
  }
  function transaction(operation: (state: StorageSnapshot, now: number) => Promise<void> | void, at?: number) {
    // Timestamp receipt, not queue completion: slow storage must not shift a
    // pause/focus boundary later and credit time after the user has left.
    const now = at ?? environment?.now() ?? Date.now();
    return serialize(async () => {
      const state = await read(now);
      const before = JSON.stringify(state);
      await operation(state, now);
      if (JSON.stringify(state) !== before) {
        state.sequence++;
        if (!snapshot(state)) throw new Error('Cannot save invalid session data.');
        await adapter.write(state);
      }
      return state;
    });
  }
  return {
    read: () => serialize(() => read()),
    initialize: () => serialize(async () => {
      const existing = await adapter.read();
      if (existing === undefined) await adapter.write(await read());
      else await read();
    }),
    updateSettings: (patch: Partial<Settings>, expectedRevision: number) => serialize(async () => {
      if (!settingsPatch(patch)) throw new Error('Invalid settings.');
      const current = await read();
      if (expectedRevision !== current.revision) throw new ConflictError('Settings changed in another window. Review the latest settings and try again.');
      const next = { ...current, revision: current.revision + 1, sequence: current.sequence + 1, settings: { ...current.settings, ...patch } };
      if (patch.checkpointsEnabled === false && next.currentSession.phase === 'checkpoint') { next.currentSession.phase = 'active'; next.sessionRevision++; }
      checkTarget(next);
      if (!snapshot(next)) throw new Error('Cannot save invalid data.');
      await adapter.write(next);
      return next;
    }),
    deleteData: (scope: 'history' | 'all', expectedRevision: number, expectedSessionRevision: number) => transaction(state => {
      if (state.revision !== expectedRevision || state.sessionRevision !== expectedSessionRevision) throw new ConflictError('Chrysalis changed in another view. Review the latest state before deleting.');
      if (scope === 'all') {
        // Keep monotonic, non-personal counters to reject old in-flight writes.
        const next = defaultSnapshot();
        next.revision = state.revision + 1; next.sessionRevision = state.sessionRevision + 1;
        next.sequence = state.sequence;
        Object.assign(state, next);
      } else {
        state.completedSessions = []; state.receipts = []; state.sessionRevision++;
        if (state.currentSession.phase === 'finished') state.currentSession = { phase: 'idle' };
      }
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
