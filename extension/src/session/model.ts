import { emptyHistoryDetails, HISTORY_LIMIT, REVISION_LIMIT, type StorageSnapshot, type CurrentSession } from '../shared/types';

export const MAX_GAP_MS = 5_000;
export const OBSERVATION_MS = 2_000;
export const INTENTIONS = ['Studying', 'Watching a specific video', 'Entertainment', 'Exploring'] as const;
export interface Plan { intention: string; targetMs: number | null }
export type SessionCommand =
  { action: 'start' | 'edit'; plan: Plan } |
  { action: 'break' | 'extend'; durationMs: number } |
  { action: 'pause' | 'resume' | 'continue' | 'dismiss-checkpoint' | 'continue-untimed' | 'end-break' | 'finish' | 'reset' };
export interface SessionMutation {
  requestId: string;
  expectedRevision: number;
  expectedSessionId: string | null;
  command: SessionCommand;
}
export interface Observation { visible: boolean; mono: number; sentAt: number; seq: number }
export interface Observer { tabId: number; windowId: number; documentId: string }
export type Boundary = { type: 'focus'; windowId: number } |
  { type: 'activate'; tabId: number; windowId: number } | { type: 'leave'; tabId: number };
export class SessionError extends Error {}
export class StaleSessionError extends SessionError {}

export function targetFromMinutes(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new SessionError('Enter a whole number of minutes from 1 to 1440.');
  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) throw new SessionError('Choose 1 to 1440 minutes.');
  return minutes * 60_000;
}
export function validatePlan(plan: Plan): Plan {
  const intention = plan.intention.trim();
  if (!intention || intention.length > 80 || /[\u0000-\u001f\u007f]/.test(intention)) throw new SessionError('Write an intention of 1 to 80 characters on one line.');
  if (plan.targetMs !== null && (!Number.isSafeInteger(plan.targetMs) || plan.targetMs < 60_000 || plan.targetMs > 86_400_000 || plan.targetMs % 60_000 !== 0)) throw new SessionError('Choose a whole number of minutes from 1 to 1440, or no time target.');
  return { intention, targetMs: plan.targetMs };
}
export const counting = (state: StorageSnapshot) => !state.settings.extensionPaused && ['active', 'checkpoint'].includes(state.currentSession.phase);
export const unfinished = (state: StorageSnapshot) => !['idle', 'finished'].includes(state.currentSession.phase);

export function checkTarget(state: StorageSnapshot) {
  const s = state.currentSession;
  if (!state.settings.extensionPaused && state.settings.checkpointsEnabled && s.phase === 'active' && s.targetMs !== null && s.elapsedMs >= s.targetMs && !s.goalAcknowledged) {
    s.phase = 'checkpoint'; s.goalAcknowledged = true; state.sessionRevision++;
  }
}
function recover(state: StorageSnapshot, reason: 'browser-restart' | 'signal-gap') {
  if (unfinished(state) && state.currentSession.phase !== 'idle') {
    state.currentSession.phase = 'paused';
    state.currentSession.breakUntil = null;
    state.currentSession.recoveryReason = reason;
    state.sessionRevision++;
  }
  state.timing.anchor = null;
}
function endBreak(s: Exclude<CurrentSession, { phase: 'idle' }>, now: number) {
  if (s.breakStartedAt !== null && s.breakUntil !== null) s.history.breakMs += Math.max(0, Math.min(now, s.breakUntil) - s.breakStartedAt);
  s.breakStartedAt = null; s.breakUntil = null;
}
function reviseTarget(s: Exclude<CurrentSession, { phase: 'idle' }>, toMs: number | null, kind: 'edit' | 'extend' | 'untimed', now: number) {
  if (s.targetMs === toMs) return;
  s.history.targetRevisions.push({ at: Math.max(now, s.startedAt), fromMs: s.targetMs, toMs, kind });
  if (s.history.targetRevisions.length > REVISION_LIMIT) { s.history.targetRevisions.shift(); s.history.omittedRevisions++; }
  s.targetMs = toMs;
}
export function reconcile(state: StorageSnapshot, now: number, epoch: string) {
  if (state.timing.browserEpoch !== epoch) {
    // A voluntary break retains its wall-clock deadline, but never resumes viewing.
    if (state.currentSession.phase !== 'break') recover(state, 'browser-restart');
    else state.sessionRevision++; // Reject commands left over from the previous browser epoch.
    state.timing = { browserEpoch: epoch, anchor: null, signals: [] };
  }
  const a = state.timing.anchor;
  if (a && (now < a.at || now - a.at > MAX_GAP_MS)) recover(state, 'signal-gap');
  const s = state.currentSession;
  if (s.phase === 'break' && s.breakUntil !== null && now >= s.breakUntil) {
    endBreak(s, now); s.phase = 'paused'; state.sessionRevision++;
  }
}
// Only a short, observed interval may be credited. No start-to-now extrapolation.
function settle(state: StorageSnapshot, now: number, mono?: number) {
  const a = state.timing.anchor;
  if (!a || !counting(state) || state.currentSession.phase === 'idle') return;
  const delta = now - a.at;
  if (delta < 0 || delta > MAX_GAP_MS || (mono !== undefined &&
      (mono < a.mono || mono - a.mono > MAX_GAP_MS || Math.abs((mono - a.mono) - delta) > 1_000))) {
    recover(state, 'signal-gap'); return;
  }
  state.currentSession.elapsedMs += Math.floor(mono === undefined ? delta : Math.min(delta, mono - a.mono));
  checkTarget(state);
}
export function observe(state: StorageSnapshot, sample: Observation, observer: Observer, eligible: boolean, now: number) {
  // No document observations are retained before starting or while not counting.
  if (!counting(state)) { state.timing.anchor = null; return; }
  const previous = state.timing.signals.find(signal => signal.documentId === observer.documentId);
  if (previous && sample.seq <= previous.seq) return;
  // Discard delayed samples rather than recreating a stale foreground owner.
  if (Math.abs(now - sample.sentAt) > MAX_GAP_MS) return;
  state.timing.signals = [...state.timing.signals.filter(signal => signal.documentId !== observer.documentId),
    { documentId: observer.documentId, seq: sample.seq }].slice(-32);
  const a = state.timing.anchor;
  const same = a?.tabId === observer.tabId && a?.documentId === observer.documentId;
  if (!eligible || !sample.visible) {
    if (same) { settle(state, now, sample.mono); state.timing.anchor = null; }
    return;
  }
  if (same) settle(state, now, sample.mono);
  // A handoff starts a new interval; it never counts overlap with the old tab.
  state.timing.anchor = counting(state) ? { ...observer, at: now, mono: sample.mono } : null;
}
export function boundary(state: StorageSnapshot, event: Boundary, now: number) {
  const a = state.timing.anchor;
  if (!a) return;
  const ends = event.type === 'focus' ? event.windowId !== a.windowId :
    event.type === 'leave' ? event.tabId === a.tabId : event.windowId === a.windowId && event.tabId !== a.tabId;
  if (ends) { settle(state, now); state.timing.anchor = null; }
}

export function setExtensionPaused(state: StorageSnapshot, paused: boolean, now: number) {
  if (paused === state.settings.extensionPaused) return;
  if (paused) {
    settle(state, now);
    const s = state.currentSession;
    if (s.phase !== 'idle' && s.phase !== 'finished') {
      if (s.phase === 'break') endBreak(s, now);
      s.phase = 'paused'; s.recoveryReason = null;
    }
    state.timing.anchor = null; state.timing.signals = [];
  }
  state.settings.extensionPaused = paused;
  state.sessionRevision++; // Earlier commands stay stale even after re-enabling.
}

export function applyCommand(state: StorageSnapshot, mutation: SessionMutation, now: number) {
  const signature = JSON.stringify(mutation);
  const receipt = state.receipts.find(item => item.id === mutation.requestId);
  if (receipt) {
    if (receipt.signature !== signature) throw new StaleSessionError('This request was already used. Refresh and try again.');
    return;
  }
  const s = state.currentSession;
  if (mutation.expectedRevision !== state.sessionRevision || mutation.expectedSessionId !== (s.phase === 'idle' ? null : s.id)) {
    throw new StaleSessionError('Your session changed in another view. Review the latest state and try again.');
  }
  const command = mutation.command;
  if (state.settings.extensionPaused && !['finish', 'reset', 'edit', 'pause'].includes(command.action)) throw new SessionError('Chrysalis is paused. Enable it before starting or resuming a session.');
  // Validate before modifying any state; failed requests cannot partially apply.
  const unchangedTarget = command.action === 'edit' && s.phase !== 'idle' && command.plan.targetMs === s.targetMs;
  const plan = command.action === 'start' || command.action === 'edit'
    ? { ...validatePlan({ ...command.plan, targetMs: unchangedTarget ? null : command.plan.targetMs }), targetMs: command.plan.targetMs } : null;
  if ((command.action === 'break' || command.action === 'extend') && (!Number.isSafeInteger(command.durationMs) || command.durationMs < 60_000 || command.durationMs > 86_400_000 || command.durationMs % 60_000)) throw new SessionError('Choose 1 to 1440 whole minutes.');
  const allowed: Record<SessionCommand['action'], string[]> = {
    start: ['idle', 'finished'], edit: ['active', 'paused', 'checkpoint', 'break'],
    pause: ['active', 'checkpoint'], resume: ['paused', 'break'], continue: ['checkpoint'], 'dismiss-checkpoint': ['checkpoint'],
    extend: ['checkpoint', 'active'], 'continue-untimed': ['checkpoint', 'active'],
    break: ['active', 'paused', 'checkpoint'], 'end-break': ['break'],
    finish: ['active', 'paused', 'checkpoint', 'break'], reset: ['finished'],
  };
  if (!allowed[command.action].includes(s.phase)) throw new StaleSessionError('This action is not available in the current session state.');
  // Continuation is offered only for an already reached target, including a dismissed prompt.
  if (['extend', 'continue-untimed'].includes(command.action) && (s.phase === 'idle' || s.targetMs === null || s.elapsedMs < s.targetMs)) throw new SessionError('This target has not been reached. Edit the plan to change it.');
  if (command.action === 'extend' && s.phase !== 'idle' && s.elapsedMs + command.durationMs + Math.max(0, state.timing.anchor ? now - state.timing.anchor.at : 0) > 86_400_000) throw new SessionError('The revised total target must be at most 1440 minutes. Choose less additional time or continue without a target.');
  settle(state, now);
  state.timing.anchor = null;
  switch (command.action) {
    case 'start':
      state.currentSession = { phase: 'active', id: mutation.requestId, ...plan!, startedAt: now,
        originalTargetMs: plan!.targetMs, elapsedMs: 0, history: emptyHistoryDetails(), breakStartedAt: null, goalAcknowledged: false, breakUntil: null,
        finishedAt: null, recoveryReason: null };
      break;
    case 'reset': state.currentSession = { phase: 'idle' }; break;
    default:
      if (s.phase === 'idle') throw new SessionError('No session is open.');
      s.recoveryReason = null;
      if (s.phase === 'break' && ['end-break', 'resume', 'finish'].includes(command.action)) endBreak(s, now);
      if (command.action === 'edit') {
        s.intention = plan!.intention;
        if (s.targetMs !== plan!.targetMs) {
          reviseTarget(s, plan!.targetMs, 'edit', now); s.goalAcknowledged = false;
          if (s.phase === 'checkpoint') s.phase = 'active';
        }
      } else if (command.action === 'pause' || command.action === 'end-break') {
        s.phase = 'paused'; s.breakUntil = null;
      } else if (command.action === 'resume' || command.action === 'continue' || command.action === 'dismiss-checkpoint') {
        s.phase = 'active'; s.breakUntil = null;
      } else if (command.action === 'extend' || command.action === 'continue-untimed') {
        reviseTarget(s, command.action === 'extend' ? s.elapsedMs + command.durationMs : null, command.action === 'extend' ? 'extend' : 'untimed', now);
        s.goalAcknowledged = false; s.phase = 'active';
      } else if (command.action === 'break') {
        s.phase = 'break'; s.breakStartedAt = now; s.breakUntil = now + command.durationMs;
      } else if (command.action === 'finish') {
        s.phase = 'finished'; s.finishedAt = Math.max(now, s.startedAt); s.breakUntil = null;
        state.completedSessions = [{ id: s.id, intention: s.intention, startedAt: s.startedAt,
          originalTargetMs: s.originalTargetMs, targetMs: s.targetMs, elapsedMs: s.elapsedMs,
          finishedAt: s.finishedAt, history: structuredClone(s.history), reflection: null, reflectionPrompted: false }, ...state.completedSessions].slice(0, HISTORY_LIMIT);
        state.historyRevision++;
      }
  }
  state.sessionRevision++;
  if (['idle', 'finished'].includes(state.currentSession.phase)) state.timing.signals = [];
  checkTarget(state);
  state.receipts = [...state.receipts, { id: mutation.requestId, signature }].slice(-64);
}

export function clockText(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function durationText(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 === 0 ? `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` : `${minutes} min ${seconds % 60} sec`;
}
export function breakCountdown(until: number, now = Date.now()): string {
  return clockText(Math.ceil(Math.max(0, until - now) / 1000) * 1000);
}
