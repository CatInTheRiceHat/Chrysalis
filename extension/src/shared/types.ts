export const SCHEMA_VERSION = 7 as const;
export type Theme = 'system' | 'light' | 'dark';
export const viewingDefaults = {
  hideHomeRecommendations: false,
  hideWatchRecommendations: false,
  hideShortsEntries: false,
};
export type ViewingControls = typeof viewingDefaults;
export const experienceDefaults = {
  extensionPaused: false,
  introSeen: false,
  defaultTargetMs: 900000 as number | null,
  breakMinutes: 5,
  checkpointsEnabled: true,
  indicatorCollapsed: true,
  autoSessionIntro: true,
};
export interface Settings extends ViewingControls {
  showIndicator: boolean; theme: Theme; extensionPaused: boolean;
  introSeen: boolean; defaultTargetMs: number | null; breakMinutes: number;
  checkpointsEnabled: boolean; indicatorCollapsed: boolean; autoSessionIntro: boolean;
}
export type SessionPhase = 'idle' | 'active' | 'paused' | 'checkpoint' | 'break' | 'finished';
export const HISTORY_LIMIT = 100;
export const REVISION_LIMIT = 100;
export interface TargetRevision { at: number; fromMs: number | null; toMs: number | null; kind: 'edit' | 'extend' | 'untimed' }
export interface HistoryDetails { complete: boolean; targetRevisions: TargetRevision[]; omittedRevisions: number; breakMs: number }
export const emptyHistoryDetails = (complete = true): HistoryDetails => ({ complete, targetRevisions: [], omittedRevisions: 0, breakMs: 0 });
export interface Reflection { answer: 'yes' | 'partly' | 'no' | null; note: string | null }
export interface SessionDetails {
  history: HistoryDetails;
  id: string;
  intention: string | null;
  startedAt: number;
  originalTargetMs: number | null;
  targetMs: number | null;
  elapsedMs: number;
}
export type CurrentSession = { phase: 'idle' } | (SessionDetails & {
  phase: Exclude<SessionPhase, 'idle'>;
  goalAcknowledged: boolean;
  breakUntil: number | null;
  breakStartedAt: number | null;
  finishedAt: number | null;
  recoveryReason: 'browser-restart' | 'signal-gap' | null;
});
export interface CompletedSessionSummary extends SessionDetails {
  finishedAt: number;
  reflection: Reflection | null;
  reflectionPrompted: boolean;
}
export interface StorageSnapshot {
  schemaVersion: typeof SCHEMA_VERSION;
  revision: number;
  sequence: number;
  sessionRevision: number;
  historyRevision: number;
  settings: Settings;
  currentSession: CurrentSession;
  completedSessions: CompletedSessionSummary[];
  receipts: { id: string; signature: string }[];
  timing: {
    browserEpoch: string | null;
    anchor: { tabId: number; windowId: number; documentId: string; at: number; mono: number } | null;
    signals: { documentId: string; seq: number }[];
  };
}
export const defaultSnapshot = (): StorageSnapshot => ({
  schemaVersion: SCHEMA_VERSION,
  revision: 0,
  sequence: 0,
  sessionRevision: 0,
  historyRevision: 0,
  settings: { showIndicator: true, theme: 'system', ...viewingDefaults, ...experienceDefaults },
  currentSession: { phase: 'idle' },
  completedSessions: [],
  receipts: [],
  timing: { browserEpoch: null, anchor: null, signals: [] },
});

export interface SessionDisplay {
  goalAcknowledged: boolean;
  id: string | null;
  revision: number;
  intention: string | null;
  phase: SessionPhase;
  elapsedMs: number;
  targetMs: number | null;
  breakUntil: number | null;
  recoveryReason: 'browser-restart' | 'signal-gap' | null;
}
export function sessionDisplay(state: StorageSnapshot): SessionDisplay {
  const s = state.currentSession;
  return s.phase === 'idle'
    ? { goalAcknowledged: false, id: null, revision: state.sessionRevision, intention: null, phase: 'idle', elapsedMs: 0, targetMs: null, breakUntil: null, recoveryReason: null }
    : { goalAcknowledged: s.goalAcknowledged, id: s.id, revision: state.sessionRevision, intention: s.intention, phase: s.phase, elapsedMs: s.elapsedMs, targetMs: s.targetMs, breakUntil: s.breakUntil, recoveryReason: s.recoveryReason };
}
