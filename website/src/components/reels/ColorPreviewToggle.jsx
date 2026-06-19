import { BRAND } from '../../brand.js';
import { Palette } from 'lucide-react';

/**
 * TEMP — Sunshine (yellow/blue) color-preview toggle.
 *
 * Controlled: pass `preview` ("yellow" | "off") and an `onToggle` handler.
 * Mirrors ThemeToggle so it sits naturally in the feed control row. The yellow
 * palette is the current project default; this flips the feed back to the
 * Chrysalis purple theme for comparison/QA.
 *
 * To remove the preview entirely: delete this file, its usage in
 * ChrysalisTopBar, the colorPreview state in ReelsPage, and the
 * data-color-preview attributes on the ReelsPage / HomeShell roots.
 */
export function ColorPreviewToggle({ preview, onToggle }) {
  const isOn = preview === 'yellow';
  return (
    <button
      type="button"
      className={isOn ? 'reels-fab is-on' : 'reels-fab'}
      onClick={onToggle}
      aria-pressed={isOn}
      aria-label={isOn ? `Sunshine preview on. Switch to ${BRAND} purple.` : 'Switch to Sunshine preview.'}
      title="Sunshine preview"
    >
      <Palette size={18} aria-hidden="true" />
    </button>
  );
}
