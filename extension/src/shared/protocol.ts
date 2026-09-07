import type { SessionDisplay, Settings, StorageSnapshot } from './types';
import { display, finite, keys, natural, record, settings, settingsPatch, snapshot } from './validation';
import { validatePlan, type Observation, type SessionMutation } from '../session/model';

export const CHANNEL = 'chrysalis/v1' as const;
export type Request = { channel: typeof CHANNEL } & (
  { type: 'PING' } | { type: 'GET_SETTINGS' } | { type: 'GET_SNAPSHOT' } | { type: 'GET_DISPLAY' } |
  { type: 'OPEN_PAGE'; page: 'session' | 'edit' | 'settings' } |
  { type: 'DELETE_DATA'; scope: 'history' | 'all'; expectedRevision: number; expectedSessionRevision: number } |
  { type: 'SESSION_CONTROL'; mutation: SessionMutation } |
  { type: 'SESSION'; mutation: SessionMutation } | { type: 'OBSERVE'; sample: Observation } |
  { type: 'UPDATE_SETTINGS'; patch: Partial<Settings>; expectedRevision: number }
);
export type Reply = { ok: true } & (
  { type: 'OPENED' } | { type: 'PONG'; version: string } |
  { type: 'SETTINGS'; settings: Settings; revision: number } |
  { type: 'DISPLAY'; settings: Settings; session: SessionDisplay; sequence: number } |
  { type: 'SNAPSHOT'; snapshot: StorageSnapshot }
) | { ok: false; code: 'INVALID' | 'FORBIDDEN' | 'STORAGE' | 'CONFLICT'; error: string };
export interface SettingsChanged {
  channel: typeof CHANNEL;
  type: 'SETTINGS_CHANGED';
  settings: Settings;
  revision: number;
  session: SessionDisplay;
  sequence: number;
}
function mutation(value: unknown): value is SessionMutation {
  if (!record(value) || !keys(value, ['requestId', 'expectedRevision', 'expectedSessionId', 'command']) ||
      typeof value.requestId !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(value.requestId) || !natural(value.expectedRevision) ||
      !(value.expectedSessionId === null || typeof value.expectedSessionId === 'string')) return false;
  const c = value.command;
  if (!record(c)) return false;
  if (c.action === 'start' || c.action === 'edit') {
    if (!keys(c, ['action', 'plan']) || !record(c.plan) || !keys(c.plan, ['intention', 'targetMs']) ||
        typeof c.plan.intention !== 'string' || !(c.plan.targetMs === null || natural(c.plan.targetMs))) return false;
    try { validatePlan({ intention: c.plan.intention, targetMs: c.plan.targetMs }); return true; } catch { return false; }
  }
  if (c.action === 'break') return keys(c, ['action', 'durationMs']) && natural(c.durationMs) &&
    c.durationMs >= 60_000 && c.durationMs <= 86_400_000 && c.durationMs % 60_000 === 0;
  return keys(c, ['action']) && typeof c.action === 'string' && ['pause', 'resume', 'continue', 'end-break', 'finish', 'reset'].includes(c.action);
}
export function parseRequest(value: unknown): Request | null {
  if (!record(value) || value.channel !== CHANNEL) return null;
  if (value.type === 'OPEN_PAGE') return keys(value, ['channel', 'type', 'page']) && typeof value.page === 'string' && ['session', 'edit', 'settings'].includes(value.page) ? value as Request : null;
  if (value.type === 'DELETE_DATA') return keys(value, ['channel', 'type', 'scope', 'expectedRevision', 'expectedSessionRevision']) && typeof value.scope === 'string' && ['history', 'all'].includes(value.scope) && natural(value.expectedRevision) && natural(value.expectedSessionRevision) ? value as Request : null;
  if (value.type === 'SESSION_CONTROL') return keys(value, ['channel', 'type', 'mutation']) && mutation(value.mutation) && ['pause', 'resume', 'finish', 'continue', 'end-break'].includes(value.mutation.command.action) ? value as Request : null;
  if (value.type === 'SESSION') return keys(value, ['channel', 'type', 'mutation']) && mutation(value.mutation) ? value as Request : null;
  if (value.type === 'OBSERVE') {
    const s = value.sample;
    return keys(value, ['channel', 'type', 'sample']) && record(s) && keys(s, ['visible', 'mono', 'sentAt', 'seq']) &&
      typeof s.visible === 'boolean' && finite(s.mono) && natural(s.sentAt) && natural(s.seq) ? value as Request : null;
  }
  if (value.type === 'UPDATE_SETTINGS') {
    return keys(value, ['channel', 'type', 'patch', 'expectedRevision']) &&
      settingsPatch(value.patch) && natural(value.expectedRevision) ? value as Request : null;
  }
  return keys(value, ['channel', 'type']) &&
    typeof value.type === 'string' && ['PING', 'GET_SETTINGS', 'GET_SNAPSHOT', 'GET_DISPLAY'].includes(value.type) ? value as Request : null;
}
export function isReply(value: unknown): value is Reply {
  if (!record(value)) return false;
  if (value.ok === false) return typeof value.code === 'string' && ['INVALID', 'FORBIDDEN', 'STORAGE', 'CONFLICT'].includes(value.code) && typeof value.error === 'string';
  if (value.ok !== true) return false;
  if (value.type === 'OPENED') return true;
  if (value.type === 'PONG') return typeof value.version === 'string';
  if (value.type === 'SETTINGS') return settings(value.settings) && natural(value.revision);
  if (value.type === 'DISPLAY') return settings(value.settings) && display(value.session) && natural(value.sequence);
  return value.type === 'SNAPSHOT' && snapshot(value.snapshot);
}
export function isSettingsChanged(value: unknown): value is SettingsChanged {
  return record(value) && value.channel === CHANNEL && value.type === 'SETTINGS_CHANGED' &&
    settings(value.settings) && natural(value.revision) && display(value.session) && natural(value.sequence);
}
export function supportedUrl(url: string | undefined): boolean {
  try { return new URL(url ?? '').origin === 'https://www.youtube.com'; } catch { return false; }
}
export type SenderRole = 'page' | 'content' | null;
export function senderRole(sender: chrome.runtime.MessageSender, extensionId: string): SenderRole {
  if (sender.id !== extensionId) return null;
  const base = `chrome-extension://${extensionId}/`;
  if ([`${base}popup.html`, `${base}options.html`, `${base}popup.html#edit`].includes(sender.url ?? '') &&
      (sender.frameId === undefined || sender.frameId === 0)) return 'page';
  if (sender.tab?.id !== undefined && sender.frameId === 0 && supportedUrl(sender.url) &&
      (!sender.origin || sender.origin === 'https://www.youtube.com')) return 'content';
  return null;
}
