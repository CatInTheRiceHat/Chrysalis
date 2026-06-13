import { Leaf, ShieldAlert } from 'lucide-react';

/**
 * Bottom overlay for a reel: wellbeing label chip, optional concern chip,
 * title, source, description. The full "why am I seeing this?" explanation
 * lives behind the action-rail button; here we only surface a brief concern
 * heads-up when one is present.
 */
export function ReelCaption({ title, source, label, description, concernReason }) {
  return (
    <div className="reel-caption">
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
      </div>
      <h2 className="reel-caption__title">{title}</h2>
      {source && <span className="reel-caption__source">{source}</span>}
      {description && <p className="reel-caption__desc">{description}</p>}
    </div>
  );
}
