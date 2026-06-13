import { useState } from 'react';
import { Heart, Bookmark, Sparkles, RefreshCw, HelpCircle, Share2, X } from 'lucide-react';

/**
 * Side action rail for a single reel. Like/save are local toggles. The "Why?"
 * button opens a small overlay with the Chrysalis ranking reason (and a concern
 * note when present). Every control is a real <button> with an aria-label so it
 * is keyboard-reachable and screen-reader friendly.
 */
export function ReelActionRail({
  rankingReason,
  concernReason,
  safetyReason,
  publicSignalReason,
  publicSignalEffect,
  sourceSafetyStatus,
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const showPublicSignal = Boolean(publicSignalReason && publicSignalEffect !== 'none');

  return (
    <div className="reel-rail" role="group" aria-label="Reel actions">
      <Action
        label="Like"
        on={liked}
        ariaLabel={liked ? 'Unlike' : 'Like'}
        onClick={() => setLiked((v) => !v)}
      >
        <Heart size={20} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />
      </Action>

      <Action
        label="Save"
        on={saved}
        ariaLabel={saved ? 'Remove from saved' : 'Save'}
        onClick={() => setSaved((v) => !v)}
      >
        <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
      </Action>

      <Action label="Reflect" ariaLabel="Reflect on this reel">
        <Sparkles size={20} aria-hidden="true" />
      </Action>

      <Action label="Regenerate" ariaLabel="Regenerate this feed">
        <RefreshCw size={20} aria-hidden="true" />
      </Action>

      <Action
        label="Why?"
        on={showWhy}
        ariaLabel="Why am I seeing this?"
        onClick={() => setShowWhy((v) => !v)}
      >
        <HelpCircle size={20} aria-hidden="true" />
      </Action>

      <Action label="Share" ariaLabel="Share this reel">
        <Share2 size={20} aria-hidden="true" />
      </Action>

      {showWhy && (
        <div className="reel-why" role="dialog" aria-label="Why am I seeing this?">
          <button
            type="button"
            className="reel-why__close"
            onClick={() => setShowWhy(false)}
            aria-label="Close explanation"
          >
            <X size={15} aria-hidden="true" />
          </button>
          <p className="reel-why__title">Why am I seeing this?</p>
          <p className="reel-why__body">
          {rankingReason || 'Curated by Chrysalis to support your wellbeing.'}
          </p>
          {showPublicSignal && (
            <div className="reel-why__public">
              <p className="reel-why__public-title">Reputation context</p>
              <p className="reel-why__public-body">{publicSignalReason}</p>
              {sourceSafetyStatus === 'caution' && (
                <p className="reel-why__public-meta">Requires review</p>
              )}
            </div>
          )}
          {concernReason && <p className="reel-why__concern">{concernReason}</p>}
          {safetyReason && <p className="reel-why__safety">{safetyReason}</p>}
        </div>
      )}
    </div>
  );
}

function Action({ children, label, ariaLabel, on = false, onClick }) {
  return (
    <button
      type="button"
      className="reel-action"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={onClick ? on : undefined}
    >
      <span className={`reel-action__btn${on ? ' is-on' : ''}`}>{children}</span>
      <span className="reel-action__label">{label}</span>
    </button>
  );
}
