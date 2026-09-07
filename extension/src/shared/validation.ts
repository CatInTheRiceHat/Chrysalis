import { defaultSnapshot, viewingDefaults, experienceDefaults, type SessionDisplay, type Settings, type StorageSnapshot } from './types';

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
  return ['introSeen', 'checkpointsEnabled', 'indicatorCollapsed'].every(key => !(key in v) || typeof v[key] === 'boolean') &&
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
function details(v: Record<string, unknown>): boolean {
  return typeof v.id === 'string' && v.id.length > 0 && v.id.length <= 128 &&
    nullableText(v.intention, 80) && natural(v.startedAt) && natural(v.elapsedMs) &&
    target(v.originalTargetMs) && target(v.targetMs);
}
function baseSnapshot(value: unknown, version: 1 | 2 | 3 | 4): boolean {
  const legacy = version === 1;
  if (!record(value) || !keys(value, ['schemaVersion', 'revision', 'settings', 'currentSession', 'completedSessions', ...(legacy ? [] : ['sequence', 'sessionRevision', 'receipts', 'timing'])]) ||
      value.schemaVersion !== version || !natural(value.revision) || !(version === 4 ? settings(value.settings) : version === 3 ? v3Settings(value.settings) : legacySettings(value.settings))) return false;
  const session = value.currentSession;
  if (!record(session)) return false;
  if (session.phase === 'idle') {
    if (!keys(session, ['phase'])) return false;
  } else if (typeof session.phase !== 'string' || !['active', 'paused', 'checkpoint', 'break', 'finished'].includes(session.phase) ||
    !keys(session, [...detailKeys, 'phase', ...(legacy ? [] : ['goalAcknowledged', 'breakUntil', 'finishedAt', 'recoveryReason'])]) || !details(session)) return false;
  if (!legacy && session.phase !== 'idle' && (typeof session.goalAcknowledged !== 'boolean' ||
      !(session.breakUntil === null || natural(session.breakUntil)) ||
      !(session.finishedAt === null || natural(session.finishedAt)) ||
      ![null, 'browser-restart', 'signal-gap'].includes(session.recoveryReason as string | null))) return false;
  if (!legacy && session.phase !== 'idle') {
    if (session.phase === 'break' ? !natural(session.breakUntil) : session.breakUntil !== null) return false;
    if (session.phase === 'finished' ? !natural(session.finishedAt) || session.finishedAt < Number(session.startedAt) : session.finishedAt !== null) return false;
    if (session.phase === 'checkpoint' && (session.goalAcknowledged !== true || !natural(session.targetMs) || Number(session.elapsedMs) < session.targetMs)) return false;
  }
  return Array.isArray(value.completedSessions) && value.completedSessions.length <= 100 &&
    value.completedSessions.every(item => record(item) &&
      keys(item, [...detailKeys, 'finishedAt', 'reflection']) && details(item) &&
      natural(item.finishedAt) && item.finishedAt >= Number(item.startedAt) && nullableText(item.reflection, 500));
}

function snapshotVersion(value: unknown, version: 2 | 3 | 4): boolean {
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
  return snapshotVersion(value, 4);
}
export const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function display(value: unknown): value is SessionDisplay {
  return record(value) && keys(value, ['id', 'revision', 'intention', 'phase', 'elapsedMs', 'targetMs', 'breakUntil', 'recoveryReason']) &&
    (value.id === null || typeof value.id === 'string') && natural(value.revision) && nullableText(value.intention, 80) &&
    typeof value.phase === 'string' && ['idle', 'active', 'paused', 'checkpoint', 'break', 'finished'].includes(value.phase) &&
    natural(value.elapsedMs) && target(value.targetMs) && (value.breakUntil === null || natural(value.breakUntil)) &&
    [null, 'browser-restart', 'signal-gap'].includes(value.recoveryReason as string | null);
}
export function migrate(value: unknown): StorageSnapshot {
  if (snapshot(value)) return structuredClone(value);
  if ((snapshotVersion(value, 2) || snapshotVersion(value, 3)) && record(value)) {
    return { ...structuredClone(value), schemaVersion: 4, settings: { ...experienceDefaults, ...viewingDefaults, ...value.settings as Settings } } as StorageSnapshot;
  }
  if (!baseSnapshot(value, 1) || !record(value)) throw new Error('Unsupported saved data; left unchanged.');
  const old = value as unknown as Pick<StorageSnapshot, 'settings' | 'revision' | 'currentSession' | 'completedSessions'>;
  const result = { ...defaultSnapshot(), ...old, settings: { ...experienceDefaults, ...viewingDefaults, ...old.settings }, schemaVersion: 4 as const };
  if (result.currentSession.phase !== 'idle') {
    const oldSession = result.currentSession;
    result.currentSession = { ...oldSession, phase: oldSession.phase === 'finished' ? 'finished' : 'paused',
      goalAcknowledged: oldSession.phase === 'checkpoint', breakUntil: null,
      finishedAt: oldSession.phase === 'finished' ? result.completedSessions.find(item => item.id === oldSession.id)?.finishedAt ?? oldSession.startedAt : null,
      recoveryReason: oldSession.phase === 'finished' ? null : 'browser-restart' };
  }
  if (!snapshot(result)) throw new Error('Saved data could not be upgraded safely.');
  return result;
}
