import type { StorageSnapshot } from '../shared/types';

export const VISIT_GAP_MS = 30 * 60_000;
export type PromptKind = 'intro' | 'checkpoint' | null;
export interface Visit { lastSeen: number; introduced: boolean; checkpoint: string | null }
// Browser-session metadata only: no URLs, document IDs, or intention text.
export function offerPrompt(previous: Visit | undefined, state: StorageSnapshot, now: number): { visit: Visit; prompt: PromptKind } {
  const visit: Visit = previous && now >= previous.lastSeen && now - previous.lastSeen < VISIT_GAP_MS
    ? { ...previous, lastSeen: now } : { lastSeen: now, introduced: false, checkpoint: previous?.checkpoint ?? null };
  const s = state.currentSession;
  let prompt: PromptKind = null;
  if (state.settings.extensionPaused) return { visit, prompt };
  if (!['idle', 'finished'].includes(s.phase)) visit.introduced = true;
  if (s.phase === 'checkpoint' && state.settings.checkpointsEnabled) {
    const key = `${s.id}:${s.targetMs}:${s.history.targetRevisions.length}:${s.history.omittedRevisions}`;
    if (visit.checkpoint !== key) { visit.checkpoint = key; prompt = 'checkpoint'; }
  } else if (state.settings.autoSessionIntro && !visit.introduced) {
    visit.introduced = true; prompt = 'intro';
  }
  return { visit, prompt };
}

// Claims serialize across all tabs and survive service-worker recreation via
// chrome.storage.session. Claim before display so a refresh cannot re-prompt.
export function createPrompts(adapter: { read(): Promise<Visit | undefined>; write(visit: Visit): Promise<void> },
  readState: () => Promise<StorageSnapshot>, now = Date.now) {
  let queue = Promise.resolve();
  return (foreground: () => Promise<boolean>): Promise<PromptKind> => {
    const next = queue.then(async () => {
      if (!await foreground()) return null;
      const state = await readState();
      const { visit, prompt } = offerPrompt(await adapter.read(), state, now());
      await adapter.write(visit);
      return prompt;
    });
    queue = next.then(() => undefined, () => undefined);
    return next;
  };
}
