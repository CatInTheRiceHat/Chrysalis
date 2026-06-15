import { useLayoutEffect, useRef, useState } from 'react';
import { motion as MOTION } from 'motion/react';
import { Play } from 'lucide-react';
import { ReelActionRail } from './ReelActionRail';
import { ReelCaption } from './ReelCaption';
import { buildYouTubeEmbedUrl } from './youtubeEmbed';

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

function resetYouTubeIframe(iframe) {
  const target = iframe?.contentWindow;
  if (!target) return;

  [
    { event: 'command', func: 'pauseVideo', args: [] },
    { event: 'command', func: 'seekTo', args: [0, true] },
    { event: 'command', func: 'pauseVideo', args: [] },
  ].forEach((message) => {
    target.postMessage(JSON.stringify(message), '*');
  });
}

/**
 * A single full-viewport Algorithm card. Two kinds of card:
 *  - real video (has `youtube_id`/`embed_url`): active-card YouTube autoplay embed,
 *    with a "curated by Chrysalis" badge and ranking/safety/concern reasons.
 *  - synthetic card (has `image`): the built-in wellbeing/pause cards.
 * No video files are downloaded — playback is a standard YouTube IFrame embed.
 */
export function ReelCard({
  reel,
  isActive = false,
  onVisible,
  onStatus,
  onRegenerate,
}) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  const videoSource = reel.embed_url || reel.embedUrl || reel.youtube_id || reel.youtubeId;
  const hasVideo = Boolean(videoSource);
  const poster = reel.thumbnail || reel.image;
  const displayLabel = reel.label || (hasVideo ? 'Curated' : null);
  const signalHint = buildSignalHint(reel);
  const embedOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const embedSrc = buildYouTubeEmbedUrl(videoSource, {
    autoplay: true,
    muted: false,
    controls: false,
    enableJsApi: true,
    origin: embedOrigin,
    startSeconds: 0,
  });
  const shouldRenderEmbed = hasVideo && embedSrc && isActive;

  useLayoutEffect(() => {
    if (!shouldRenderEmbed) return undefined;
    const iframe = iframeRef.current;
    return () => resetYouTubeIframe(iframe);
  }, [shouldRenderEmbed, embedSrc]);

  const requestPlayback = () => {
    onVisible?.();
  };

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
              shouldRenderEmbed ? (
                <iframe
                  key={embedSrc}
                  ref={iframeRef}
                  className="reel-media reel-embed"
                  src={embedSrc}
                  title={reel.title}
                  loading={isActive ? 'eager' : 'lazy'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <button
                  type="button"
                  className="reel-play"
                  onClick={requestPlayback}
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
