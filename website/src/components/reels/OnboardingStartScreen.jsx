import { useState } from 'react';
import { motion as MOTION } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { INTENTIONS, DEFAULT_MODE } from './reelsData';

/**
 * First-run start screen for /reels. Asks how the user wants their feed to
 * support them today, then opens the feed on the matching mode.
 *
 * Props:
 *   onStart(mode) — called with the chosen mode key when the user begins.
 */
export function OnboardingStartScreen({ onStart }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = INTENTIONS.find((i) => i.id === selectedId);

  return (
    <MOTION.div
      className="reels-onboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="reels-onboard__head">
        <h1 className="reels-onboard__title">Welcome to your Chrysalis feed.</h1>
        <p className="reels-onboard__subtitle">
          Before you scroll, choose how you want your feed to support you today.
        </p>
      </div>

      <div className="intention-grid" role="group" aria-label="Choose your intention">
        {INTENTIONS.map((intention) => {
          const isSelected = intention.id === selectedId;
          return (
            <button
              key={intention.id}
              type="button"
              className={`intention-card${isSelected ? ' is-selected' : ''}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedId(intention.id)}
            >
              <span className="intention-card__icon" aria-hidden="true">{intention.icon}</span>
              <span className="intention-card__title">{intention.title}</span>
              <span className="intention-card__desc">{intention.description}</span>
            </button>
          );
        })}
      </div>

      <div className="reels-onboard__actions">
        <button
          type="button"
          className="onboard-cta"
          disabled={!selected}
          aria-disabled={!selected}
          onClick={() => selected && onStart(selected.mode, selected.id)}
        >
          Start My Feed
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="onboard-skip"
          onClick={() => onStart(DEFAULT_MODE, null)}
        >
          Skip for now
        </button>
      </div>
    </MOTION.div>
  );
}
