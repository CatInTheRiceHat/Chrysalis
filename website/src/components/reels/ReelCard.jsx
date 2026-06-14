import { useState } from 'react';
import { motion as MOTION } from 'motion/react';
import { Play } from 'lucide-react';
import { ReelActionRail } from './ReelActionRail';
import { ReelCaption } from './ReelCaption';

function scoreValue(card, key) {
  const value = Number(card.chrysalis_scores?.[key]);
  return Number.isFinite(value) ? value : null;
}

function buildSignalHint(reel) {
  const hints = [];
  const calm = scoreValue(reel, 'calm');
  const comparisonRisk = scoreValue(reel, 'comparison_risk');
  const prosocial = scoreValue(reel, 'prosocial');
  const selfLove = scoreValue(reel, 'self_love');
  const reflection = scoreValue(reel, 'reflection_value');
  const novelty = scoreValue(reel, 'novelty');

  if (calm !== null && calm >= 0.6) hints.push('High calm');
  if (comparisonRisk !== null && comparisonRisk <= 0.2) hints.push('low comparison pressure');
  if (prosocial !== null && prosocial >= 0.5) hints.push('prosocial signal');
  if (selfLove !== null && selfLove >= 0.5) hints.push('self-love signal');
  if (reflection !== null && reflection >= 0.5) hints.push('reflective signal');
  if (novelty !== null && novelty >= 0.5) hints.push('fresh mix');

  if (hints.length) return hints.slice(0, 3).join(' · ');
  if (reel.ranking_reason) return reel.ranking_reason;
  if (reel.reason) return reel.reason;
  return 'Curated for this mode';
}

/**
 * A single full-viewport Algorithm card. Two kinds of card:
 *  - real video (has `youtube_id`): thumbnail poster + tap-to-play YouTube embed,
 *    with a "curated by Chrysalis" badge and ranking/safety/concern reasons.
 *  - synthetic card (has `image`): the built-in wellbeing/pause cards.
 * No video files are downloaded — playback is a standard YouTube IFrame embed.
 */
export function ReelCard({
  reel,
  onVisible,
  onStatus,
  onRegenerate,
}) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  const hasVideo = Boolean(reel.youtube_id);
  const poster = reel.thumbnail || reel.image;
  const displayLabel = reel.label || (hasVideo ? 'Curated' : null);
  const signalHint = buildSignalHint(reel);
  const embedOrigin = typeof window !== 'undefined'
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  return (
    <article className="reel-card">
      <MOTION.div
        className="reel-layout"
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ amount: 0.5 }}
        onViewportEnter={onVisible}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ReelCaption
          title={reel.title}
          source={reel.source}
          label={displayLabel}
          description={reel.description}
          concernReason={reel.concern_reason}
          publicSignalEffect={reel.public_signal_effect}
          placement="desktop"
          signalHint={signalHint}
          isLiveVideo={hasVideo}
        />

        <div className="reel-media-cell">
          <div className="reel-frame">
            {/* Brand wash always sits behind the media so any image reads on-palette */}
            <div className="reel-media-wash" aria-hidden="true" />

            {hasVideo ? (
              playing ? (
                <iframe
                  className="reel-media reel-embed"
                  src={`https://www.youtube.com/embed/${reel.youtube_id}?autoplay=1&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1${embedOrigin}`}
                  title={reel.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <button
                  type="button"
                  className="reel-play"
                  onClick={() => setPlaying(true)}
                  aria-label={`Play video: ${reel.title}`}
                >
                  {poster && (
                    <img
                      className="reel-media"
                      src={poster}
                      alt=""
                      loading="lazy"
                      onLoad={() => setLoaded(true)}
                      style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
                    />
                  )}
                  <span className="reel-play__badge" aria-hidden="true">
                    <Play size={26} fill="currentColor" />
                  </span>
                  <span className="reel-play__hint" aria-hidden="true">Tap to play</span>
                </button>
              )
            ) : poster ? (
              <img
                className="reel-media"
                src={poster}
                alt={reel.title}
                loading="lazy"
                onLoad={() => setLoaded(true)}
                style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.5s ease' }}
              />
            ) : null}

            {hasVideo && (
              <span className="reel-source-badge">YouTube embed · curated by Chrysalis</span>
            )}

            <ReelCaption
              title={reel.title}
              source={reel.source}
              label={displayLabel}
              description={reel.description}
              concernReason={reel.concern_reason}
              publicSignalEffect={reel.public_signal_effect}
              placement="mobile"
            />
          </div>
        </div>

        <ReelActionRail
          title={reel.title}
          source={reel.source}
          rankingReason={reel.ranking_reason}
          fallbackReason={reel.reason}
          concernReason={reel.concern_reason}
          safetyReason={reel.safety_reason}
          publicSignalReason={reel.public_signal_reason}
          publicSignalEffect={reel.public_signal_effect}
          sourceSafetyStatus={reel.source_safety_status}
          onStatus={onStatus}
          onRegenerate={onRegenerate}
        />
      </MOTION.div>
    </article>
  );
}
