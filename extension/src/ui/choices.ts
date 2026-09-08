import { durationText, targetFromMinutes, type SessionCommand } from '../session/model';
import type { SessionDisplay, Settings } from '../shared/types';

// The popup and isolated content UI use identical choices and validation.
export const checkpointMarkup = `<section id="checkpoint-controls" aria-labelledby="checkpoint-copy" hidden>
  <p id="checkpoint-copy" tabindex="-1"></p>
  <p class="note">Foreground time keeps counting while you decide. Playback continues.</p>
  <label for="additional-duration">Additional foreground YouTube time</label>
  <select id="additional-duration"><option value="5">5 minutes</option><option value="15" selected>15 minutes</option><option value="30">30 minutes</option><option value="custom">Custom duration</option></select>
  <div id="additional-custom" hidden><label for="additional-minutes">Additional minutes (1–1440)</label><input id="additional-minutes" type="number" min="1" max="1440" step="1" value="10"></div>
  <div class="actions"><button data-choice="extend">Continue with additional time</button><button data-choice="dismiss-checkpoint">Dismiss checkpoint</button></div>
</section>`;
export const breakMarkup = `<div id="break-controls" class="break-controls">
  <label for="break-duration">Break duration</label><select id="break-duration"><option value="2">2 minutes</option><option value="5" selected>5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="custom">Custom duration</option></select>
  <div id="break-custom" hidden><label for="break-minutes">Break minutes (1–1440)</label><input id="break-minutes" type="number" min="1" max="1440" step="1" value="5"></div>
  <button data-choice="break">Take a break</button><p class="note">Breaks pause this timer. YouTube stays available.</p>
</div>`;

export function mountChoices(root: HTMLElement | ShadowRoot, run: (command: SessionCommand) => Promise<void>, error: (message: string) => void, trustedOnly = false) {
  const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  let preference: number | undefined;
  let busy = false;
  function visibility() {
    el('additional-custom').hidden = el<HTMLSelectElement>('additional-duration').value !== 'custom';
    el('break-custom').hidden = el<HTMLSelectElement>('break-duration').value !== 'custom';
  }
  el('additional-duration').addEventListener('change', visibility);
  el('break-duration').addEventListener('change', visibility);
  root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', async event => {
    if (busy || (trustedOnly && !event.isTrusted)) return;
    busy = true;
    try {
      const action = button.dataset.choice;
      if (action === 'extend' || action === 'break') {
        const select = el<HTMLSelectElement>(action === 'extend' ? 'additional-duration' : 'break-duration');
        const input = el<HTMLInputElement>(action === 'extend' ? 'additional-minutes' : 'break-minutes');
        const durationMs = targetFromMinutes(select.value === 'custom' ? input.value : select.value);
        await run({ action, durationMs });
      } else if (action === 'dismiss-checkpoint') await run({ action });
    } catch (e) { error(e instanceof Error ? e.message : 'Review the duration and try again.'); }
    finally { busy = false; }
  }));
  return {
    render(s: SessionDisplay, settings: Settings, disabled: boolean) {
      if (preference !== settings.breakMinutes) {
        preference = settings.breakMinutes;
        el<HTMLInputElement>('break-minutes').value = String(preference);
        el<HTMLSelectElement>('break-duration').value = [2, 5, 10, 15].includes(preference) ? String(preference) : 'custom';
        visibility();
      }
      const copy = s.targetMs === null ? '' : `You planned ${durationText(s.targetMs)}. What would you like to do next?`;
      if (el('checkpoint-copy').textContent !== copy) el('checkpoint-copy').textContent = copy;
      el('checkpoint-controls').hidden = s.phase !== 'checkpoint';
      el('break-controls').hidden = !['active', 'paused', 'checkpoint'].includes(s.phase);
      root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('[data-choice], #checkpoint-controls input, #checkpoint-controls select, #break-controls input, #break-controls select').forEach(control => { control.disabled = disabled; });
    },
  };
}
