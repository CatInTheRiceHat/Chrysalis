import { useEffect, useState } from 'react';
import { Bookmark, Play, X } from 'lucide-react';
import { HomeShell } from '../home/HomeShell';
import { useSavedVideos } from '../reels/useSavedVideos';
import { buildYouTubeEmbedUrl } from '../reels/youtubeEmbed';
import '../../saved.css';

/**
 * Saved — the videos a user kept via the bookmark on a feed card.
 *
 * Reuses the social-app chrome via <HomeShell active="saved"> so it feels like one
 * app with Home and the feed. Saves are device-local (useSavedVideos → localStorage);
 * there is no backend, so this lists snapshots taken at save time. Tapping a tile
 * opens an in-app modal player; the bookmark on a tile removes it.
 */
export function SavedPage() {
  const { saved, removeSave } = useSavedVideos();
  const [active, setActive] = useState(null);

  return (
    <HomeShell active="saved">
      <div className="home-narrow saved-page">
        <header className="saved-head">
          <h1 className="saved-head__title">Saved</h1>
          <p className="saved-head__sub">
            {saved.length === 0
              ? 'Your kept videos live here.'
              : `${saved.length} kept ${saved.length === 1 ? 'video' : 'videos'} — only on this device.`}
          </p>
        </header>

        {saved.length === 0 ? (
          <div className="saved-empty">
            <span className="saved-empty__icon" aria-hidden="true">
              <Bookmark size={28} />
            </span>
            <p className="saved-empty__title">Nothing saved yet</p>
            <p className="saved-empty__note">
              Tap the bookmark on any video in your feed to keep it here.
            </p>
          </div>
        ) : (
          <ul className="saved-grid" aria-label="Saved videos">
            {saved.map((item) => (
              <li key={item.id} className="saved-tile">
                <button
                  type="button"
                  className="saved-tile__open"
                  onClick={() => setActive(item)}
                  aria-label={`Play ${item.title}`}
                >
                  <span className="saved-tile__thumb">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <span className="saved-tile__thumb-fallback" aria-hidden="true" />
                    )}
                    <span className="saved-tile__play" aria-hidden="true">
                      <Play size={20} fill="currentColor" />
                    </span>
                  </span>
                  <span className="saved-tile__title">{item.title}</span>
                  {item.source && <span className="saved-tile__source">{item.source}</span>}
                </button>
                <button
                  type="button"
                  className="saved-tile__remove"
                  onClick={() => removeSave(item.id)}
                  aria-label={`Remove ${item.title} from saved`}
                >
                  <Bookmark size={18} fill="currentColor" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <SavedVideoModal video={active} onClose={() => setActive(null)} />
      )}
    </HomeShell>
  );
}

function SavedVideoModal({ video, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const src = buildYouTubeEmbedUrl(video.embedUrl || video.youtubeId, {
    autoplay: true,
    muted: false,
    controls: true,
    origin,
  });

  return (
    <div
      className="saved-modal"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div className="saved-modal__panel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="saved-modal__close"
          onClick={onClose}
          aria-label="Close player"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="saved-modal__stage">
          {src ? (
            <iframe
              className="saved-modal__embed"
              src={src}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <p className="saved-modal__missing">This video can’t be played here anymore.</p>
          )}
        </div>
        <p className="saved-modal__title">{video.title}</p>
        {video.source && <p className="saved-modal__source">{video.source}</p>}
      </div>
    </div>
  );
}
