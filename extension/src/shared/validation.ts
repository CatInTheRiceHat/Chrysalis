import { defaultSnapshot, emptyHistoryDetails, viewingDefaults, experienceDefaults, type SessionDisplay, type Settings, type StorageSnapshot } from './types';

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function keys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}
export const natural = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export const theme = (value: unknown): boolean => typeof value === 'string' && ['system', 'light', 'dark'].includes(value);
function legacySettings(value: unknown): boolean {
  return record(value) && keys(value, ['showIndicator', 'theme']) &&
    typeof value.showIndicator === 'boolean' && theme(value.theme);
}
const controlKeys = Object.keys(viewingDefaults);
function v3Settings(value: unknown): boolean {
  return record(value) && keys(value, ['showIndicator', 'theme', ...controlKeys]) &&
    typeof value.showIndicator === 'boolean' && theme(value.theme) &&
    controlKeys.every(key => typeof value[key] === 'boolean');
}
const experienceKeys = Object.keys(experienceDefaults);
function experiencePatch(v: Record<string, unknown>): boolean {
  return ['introSeen', 'checkpointsEnabled', 'indicatorCollapsed', 'extensionPaused'].every(key => !(key in v) || typeof v[key] === 'boolean') &&
    (!('defaultTargetMs' in v) || v.defaultTargetMs === null || (natural(v.defaultTargetMs) && v.defaultTargetMs >= 60000 && v.defaultTargetMs <= 86400000 && v.defaultTargetMs % 60000 === 0)) &&
    (!('breakMinutes' in v) || (natural(v.breakMinutes) && v.breakMinutes >= 1 && v.breakMinutes <= 1440));
}
export function settings(value: unknown): value is Settings {
  return record(value) && settingsPatch(value) &&
    ['showIndicator', 'theme', ...controlKeys, ...experienceKeys].every(key => key in value);
}
export function settingsPatch(value: unknown): value is Partial<Settings> {
  return record(value) && Object.keys(value).length > 0 && keys(value, ['showIndicator', 'theme', ...controlKeys, ...experienceKeys]) && experiencePatch(value) &&
    (!('showIndicator' in value) || typeof value.showIndicator === 'boolean') &&
    (!('theme' in value) || theme(value.theme)) &&
    controlKeys.every(key => !(key in value) || typeof value[key] === 'boolean');
}
const nullableText = (value: unknown, max: number) => value === null ||
  (typeof value === 'string' && value.length > 0 && value.length <= max);
const target = (value: unknown) => value === null ||
  (natural(value) && value > 0 && value <= 86_400_000);
const detailKeys = ['id', 'intention', 'startedAt', 'originalTargetMs', 'targetMs', 'elapsedMs'];
function historyDetails(v: unknown): boolean {
  return record(v) && keys(v, ['complete', 'targetRevisions', 'omittedRevisions', 'breakMs']) &&
    typeof v.complete === 'boolean' && natural(v.omittedRevisions) && natural(v.breakMs) &&
    Array.isArray(v.targetRevisions) && v.targetRevisions.length <= 100 && v.targetRevisions.every(r =>
      record(r) && keys(r, ['at', 'fromMs', 'toMs', 'kind']) && natural(r.at) && target(r.fromMs) && target(r.toMs) &&
      typeof r.kind === 'string' && ['edit', 'extend', 'untimed'].includes(r.kind));
}
export function reflection(v: unknown): boolean {
  return v === null || (record(v) && keys(v, ['answer', 'note']) && [null, 'yes', 'partly', 'no'].includes(v.answer as string | null) &&
    nullableText(v.note, 500) && (v.answer !== null || v.note !== null));
}
function details(v: Record<string, unknown>): boolean {
  return typeof v.id === 'string' && v.id.length > 0 && v.id.length <= 128 &&
    nullableText(v.intention, 80) && natural(v.startedAt) && natural(v.elapsedMs) &&
    target(v.originalTargetMs) && target(v.targetMs);
}
function priorExperienceSettings(value: unknown): boolean {
  return record(value) && !('extensionPaused' in value) && settings({ ...value, extensionPaused: false });
}
function baseSnapshot(value: unknown, version: 1 | 2 | 3 | 4 | 5 | 6): boolean {
  const legacy = version === 1;
  if (!record(value) || !keys(value, ['schemaVersion', 'revision', 'settings', 'currentSession', 'completedSessions', ...(legacy ? [] : ['sequence', 'sessionRevision', 'receipts', 'timing']), ...(version >= 5 ? ['historyRevision'] : [])]) ||
      value.schemaVersion !== version || !natural(value.revision) || !(version === 6 ? settings(value.settings) : version >= 4 ? priorExperienceSettings(value.settings) : version === 3 ? v3Settings(value.settings) : legacySettings(value.settings))) return false;
  const session = value.currentSession;
  if (!record(session)) return false;
  if (session.phase === 'idle') {
    if (!keys(session, ['phase'])) return false;
  } else if (typeof session.phase !== 'string' || !['active', 'paused', 'checkpoint', 'break', 'finished'].includes(session.phase) ||
    !keys(session, [...detailKeys, ...(version >= 5 ? ['history', 'breakStartedAt'] : []), 'phase', ...(legacy ? [] : ['goalAcknowledged', 'breakUntil', 'finishedAt', 'recoveryReason'])]) || !details(session)) return false;
  if (!legacy && session.phase !== 'idle' && (typeof session.goalAcknowledged !== 'boolean' ||
      !(session.breakUntil === null || natural(session.breakUntil)) ||
      !(session.finishedAt === null || natural(session.finishedAt)) ||
      ![null, 'browser-restart', 'signal-gap'].includes(session.recoveryReason as string | null))) return false;
  if (!legacy && session.phase !== 'idle') {
    if (session.phase === 'break' ? !natural(session.breakUntil) : session.breakUntil !== null) return false;
    if (session.phase === 'finished' ? !natural(session.finishedAt) || session.finishedAt < Number(session.startedAt) : session.finishedAt !== null) return false;
    if (session.phase === 'checkpoint' && (session.goalAcknowledged !== true || !natural(session.targetMs) || Number(session.elapsedMs) < session.targetMs)) return false;
  }
  if (version >= 5 && (!natural(value.historyRevision) || (session.phase !== 'idle' && (!historyDetails(session.history) ||
    (session.phase === 'break' ? !natural(session.breakStartedAt) || Number(session.breakStartedAt) > Number(session.breakUntil) : session.breakStartedAt !== null))))) return false;
  return Array.isArray(value.completedSessions) && value.completedSessions.length <= 100 &&
    (version < 5 || new Set(value.completedSessions.map(s => record(s) ? s.id : undefined)).size === value.completedSessions.length) &&
    value.completedSessions.every(item => record(item) &&
      keys(item, [...detailKeys, 'finishedAt', 'reflection', ...(version >= 5 ? ['history', 'reflectionPrompted'] : [])]) && details(item) &&
      natural(item.finishedAt) && item.finishedAt >= Number(item.startedAt) && (version >= 5 ? historyDetails(item.history) && typeof item.reflectionPrompted === 'boolean' && reflection(item.reflection) : nullableText(item.reflection, 500)));
}

function snapshotVersion(value: unknown, version: 2 | 3 | 4 | 5 | 6): boolean {
  if (!baseSnapshot(value, version) || !record(value) || !natural(value.sequence) || !natural(value.sessionRevision)) return false;
  if (!Array.isArray(value.receipts) || value.receipts.length > 64 || !value.receipts.every(item => record(item) &&
      keys(item, ['id', 'signature']) && typeof item.id === 'string' && item.id.length <= 128 &&
      typeof item.signature === 'string' && item.signature.length <= 2000)) return false;
  const timing = value.timing;
  if (!record(timing) || !keys(timing, ['browserEpoch', 'anchor', 'signals']) ||
      !(timing.browserEpoch === null || typeof timing.browserEpoch === 'string')) return false;
  const a = timing.anchor;
  if (a !== null && record(value.currentSession) && !['active', 'checkpoint'].includes(String(value.currentSession.phase))) return false;
  if (a !== null && (!record(a) || !keys(a, ['tabId', 'windowId', 'documentId', 'at', 'mono']) ||
      !natural(a.tabId) || !natural(a.windowId) || !natural(a.at) || !finite(a.mono) || typeof a.documentId !== 'string')) return false;
  return Array.isArray(timing.signals) && timing.signals.length <= 32 && timing.signals.every(item =>
    record(item) && keys(item, ['documentId', 'seq']) && typeof item.documentId === 'string' && natural(item.seq));
}
export function snapshot(value: unknown): value is StorageSnapshot {
  return snapshotVersion(value, 6);
}
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function display(value: unknown): value is SessionDisplay {
  return record(value) && typeof value.goalAcknowledged === 'boolean' && keys(value, ['goalAcknowledged', 'id', 'revision', 'intention', 'phase', 'elapsedMs', 'targetMs', 'breakUntil', 'recoveryReason']) &&
    (value.id === null || typeof value.id === 'string') && natural(value.revision) && nullableText(value.intention, 80) &&
    typeof value.phase === 'string' && ['idle', 'active', 'paused', 'checkpoint', 'break', 'finished'].includes(value.phase) &&
    natural(value.elapsedMs) && target(value.targetMs) && (value.breakUntil === null || natural(value.breakUntil)) &&
    [null, 'browser-restart', 'signal-gap'].includes(value.recoveryReason as string | null);
}
export function migrate(value: unknown, now = Date.now()): StorageSnapshot {
  if (snapshot(value)) return structuredClone(value);
  if (snapshotVersion(value, 5) && record(value)) {
    const old = structuredClone(value) as unknown as StorageSnapshot;
    return { ...old, schemaVersion: 6, settings: { ...old.settings, extensionPaused: false } };
  }
  const valid = [2, 3, 4].some(v => snapshotVersion(value, v as 2 | 3 | 4)) || baseSnapshot(value, 1);
  if (!valid || !record(value)) throw new Error('Unsupported saved data; left unchanged.');
  const old = structuredClone(value) as unknown as StorageSnapshot;
  const result = { ...defaultSnapshot(), ...old, historyRevision: 0, settings: { ...experienceDefaults, ...viewingDefaults, ...old.settings }, schemaVersion: 6 as const };
  if (result.currentSession.phase !== 'idle') {
    const s = result.currentSession;
    if (value.schemaVersion === 1) {
      s.goalAcknowledged = s.phase === 'checkpoint'; s.phase = s.phase === 'finished' ? 'finished' : 'paused';
      s.breakUntil = null;
      s.finishedAt = s.phase === 'finished' ? result.completedSessions.find(item => item.id === s.id)?.finishedAt ?? s.startedAt : null;
      s.recoveryReason = s.phase === 'finished' ? null : 'browser-restart';
    }
    s.history = emptyHistoryDetails(false);
    s.breakStartedAt = s.phase === 'break' ? Math.min(now, s.breakUntil!) : null;
  }
  result.completedSessions = result.completedSessions.map(item => ({ ...item, history: emptyHistoryDetails(false),
    reflection: typeof item.reflection === 'string' ? { answer: null, note: item.reflection } : null,
    reflectionPrompted: true })); // Never retroactively prompt for old sessions.
  if (!snapshot(result)) throw new Error('Saved data could not be upgraded safely.');
  return result;
}
