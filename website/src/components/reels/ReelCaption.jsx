import { useId, useState } from 'react';
import { Leaf, ShieldAlert } from 'lucide-react';

/**
 * Reel text block. On desktop this becomes the left-side editorial info panel;
 * on mobile it stays as the compact bottom overlay with a local more/less
 * description toggle.
 */
export function ReelCaption({
  title,
  source,
  label,
  description,
  concernReason,
  publicSignalEffect,
  placement = 'mobile',
  signalHint,
  isLiveVideo = false,
}) {
  const descriptionId = useId();
  const [expanded, setExpanded] = useState(false);
  const showReviewSignal = Boolean(publicSignalEffect && publicSignalEffect !== 'none');
  const canExpand = placement === 'mobile' && Boolean(description && description.length > 96);

  return (
    <div className={`reel-caption reel-caption--${placement}${expanded ? ' is-expanded' : ''}`}>
      <div className="reel-caption__chips">
        {label && (
          <span className="reel-caption__chip">
            <Leaf size={12} aria-hidden="true" />
            {label}
          </span>
        )}
        {concernReason && (
          <span className="reel-caption__chip reel-caption__chip--concern">
            <ShieldAlert size={12} aria-hidden="true" />
            Heads up
          </span>
        )}
        {showReviewSignal && (
          <span className="reel-caption__chip reel-caption__chip--review">
            <ShieldAlert size={12} aria-hidden="true" />
            Review signal
          </span>
        )}
      </div>
      <h2 className="reel-caption__title">{title}</h2>
      {source && <span className="reel-caption__source">{source}</span>}
      {description && (
        <p className="reel-caption__desc" id={descriptionId}>
          {description}
        </p>
      )}
      {canExpand && (
        <button
          type="button"
          className="reel-caption__more"
          aria-expanded={expanded}
          aria-controls={descriptionId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'less' : 'more'}
        </button>
      )}
      {placement === 'desktop' && signalHint && (
        <p className="reel-caption__signal">{signalHint}</p>
      )}
      {placement === 'desktop' && isLiveVideo && (
        <p className="reel-caption__embed-note">YouTube embed · curated by Chrysalis</p>
      )}
    </div>
  );
}
