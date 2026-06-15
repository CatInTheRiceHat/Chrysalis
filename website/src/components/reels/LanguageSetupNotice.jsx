import { useState } from 'react';
import { motion as MOTION } from 'motion/react';
import { Globe, MapPin } from 'lucide-react';
import {
  LANGUAGES,
  REGIONS,
  DEFAULT_LANGUAGE,
  DEFAULT_REGION,
  guessLocalePreferences,
  requestApproxLocationConsent,
} from './preferences';

const NOTICE_COPY =
  'Help us show videos you can understand. Chrysalis can use your preferred '
  + 'language and approximate region to improve video recommendations. '
  + 'We do not need your exact location.';

/**
 * Lightweight language + region setup notice shown near the feed/mode entry.
 * Three paths: approximate location (browser-consent only), manual setup, or
 * default. All three complete setup so the notice does not reappear.
 */
export function LanguageSetupNotice({ prefs, onSave }) {
  const [view, setView] = useState('notice'); // 'notice' | 'manual'
  const [saving, setSaving] = useState(false);
  const [useApprox, setUseApprox] = useState(Boolean(prefs?.use_approx_location));
  const [language, setLanguage] = useState(prefs?.preferred_language || DEFAULT_LANGUAGE);
  const [region, setRegion] = useState(prefs?.region_code || DEFAULT_REGION);

  const commit = async (payload) => {
    if (saving) return;
    setSaving(true);
    await onSave({ has_completed_language_setup: true, ...payload });
    // Parent unmounts this component on completion; no need to reset state.
  };

  const handleSkip = () => commit({
    preferred_language: DEFAULT_LANGUAGE,
    region_code: DEFAULT_REGION,
    use_approx_location: false,
  });

  const handleUseApproxLocation = async () => {
    const { granted } = await requestApproxLocationConsent();
    setUseApprox(granted);
    if (granted) {
      const guess = guessLocalePreferences();
      setLanguage(guess.preferred_language);
      setRegion(guess.region_code);
    }
    // Always confirm manually — we never auto-save a coarse guess.
    setView('manual');
  };

  const handleSaveManual = () => commit({
    preferred_language: language,
    region_code: region,
    use_approx_location: useApprox,
  });

  return (
    <MOTION.div
      className="lang-setup"
      role="dialog"
      aria-modal="true"
      aria-label="Language and region setup"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="lang-setup__scrim" aria-hidden="true" />
      <MOTION.div
        className="lang-setup__panel"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lang-setup__icon" aria-hidden="true">
          <Globe size={22} />
        </div>

        {view === 'notice' ? (
          <>
            <h2 className="lang-setup__title">Show videos you can understand</h2>
            <p className="lang-setup__copy">{NOTICE_COPY}</p>
            <div className="lang-setup__actions">
              <button
                type="button"
                className="lang-setup__btn lang-setup__btn--primary"
                onClick={handleUseApproxLocation}
                disabled={saving}
              >
                <MapPin size={16} aria-hidden="true" />
                Use approximate location
              </button>
              <button
                type="button"
                className="lang-setup__btn"
                onClick={() => setView('manual')}
                disabled={saving}
              >
                Choose manually
              </button>
              <button
                type="button"
                className="lang-setup__btn lang-setup__btn--ghost"
                onClick={handleSkip}
                disabled={saving}
              >
                Use defaults
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="lang-setup__title">Set your language &amp; region</h2>
            <p className="lang-setup__copy">
              We use these to recommend videos you can understand.
            </p>
            <div className="lang-setup__fields">
              <label className="lang-setup__field">
                <span className="lang-setup__label">Preferred language</span>
                <select
                  className="lang-setup__select"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lang-setup__field">
                <span className="lang-setup__label">Region</span>
                <select
                  className="lang-setup__select"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                >
                  {REGIONS.map((reg) => (
                    <option key={reg.code} value={reg.code}>
                      {reg.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lang-setup__actions">
              <button
                type="button"
                className="lang-setup__btn lang-setup__btn--primary"
                onClick={handleSaveManual}
                disabled={saving}
              >
                Save preferences
              </button>
              <button
                type="button"
                className="lang-setup__btn lang-setup__btn--ghost"
                onClick={handleSkip}
                disabled={saving}
              >
                Use defaults
              </button>
            </div>
          </>
        )}
      </MOTION.div>
    </MOTION.div>
  );
}
