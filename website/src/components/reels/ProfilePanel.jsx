import { Check, Flame, Sparkles, UserCircle, UserPlus, Users, X } from 'lucide-react';
import {
  FAVORITE_ACTIVITIES,
  INTERESTS,
  WELLBEING_GOALS,
  goalById,
  interestById,
} from './profileData';

/**
 * Curated profile panel: an editable wellbeing bio (display name, bio, goals,
 * interests, favorite activities), the user's badges + streak from challenges, and
 * a community section to connect with like-minded people. No follower counts, no
 * popularity ranking — meaningful connection over comparison.
 */
export function ProfilePanel({
  profile,
  onField,
  onToggle,
  community,
  onConnect,
  stats,
  badges,
  onStatus,
  onClose,
}) {
  const earnedBadges = (badges || []).filter((badge) => badge.earned);

  const connect = (person) => {
    if (person.isFriend) return;
    onConnect?.(person.id);
    onStatus?.(person.isConnected ? `Disconnected from ${person.displayName}.` : `You and ${person.displayName} are connected 🦋`);
  };

  return (
    <section className="profile" aria-label="Your profile">
      <div className="profile__head">
        <div>
          <span className="profile__eyebrow">
            <UserCircle size={13} aria-hidden="true" />
            Curated profile
          </span>
          <h2>Your wellbeing profile</h2>
        </div>
        {onClose && (
          <button type="button" className="profile__close" onClick={onClose} aria-label="Close profile">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* identity */}
      <div className="profile__card">
        <span className="profile__avatar" aria-hidden="true">{profile.emoji}</span>
        <div className="profile__id">
          <input
            className="profile__name"
            value={profile.displayName}
            onChange={(event) => onField('displayName', event.target.value)}
            aria-label="Display name"
            maxLength={40}
          />
          <span className="profile__handle">{profile.handle}</span>
        </div>
        <div className="profile__journey" title="Your wellbeing journey">
          <span><Sparkles size={14} aria-hidden="true" /> {stats?.points ?? 0}</span>
          <span><Flame size={14} aria-hidden="true" /> {stats?.streak ?? 0}</span>
        </div>
      </div>

      <label className="profile__bio-label">
        <span>Bio</span>
        <textarea
          value={profile.bio}
          onChange={(event) => onField('bio', event.target.value)}
          rows={2}
          maxLength={160}
          placeholder="Share what a healthier feed means to you…"
        />
      </label>

      {earnedBadges.length > 0 && (
        <div className="profile__section">
          <span className="profile__section-title">Badges</span>
          <div className="profile__badges">
            {earnedBadges.map((badge) => (
              <span key={badge.id} className="profile__badge" title={badge.blurb}>
                <span aria-hidden="true">{badge.emoji}</span> {badge.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <ChipGroup
        title="Wellbeing goals"
        options={WELLBEING_GOALS}
        selected={profile.goals}
        onToggle={(id) => onToggle('goals', id)}
        withEmoji
      />
      <ChipGroup
        title="Interests"
        options={INTERESTS}
        selected={profile.interests}
        onToggle={(id) => onToggle('interests', id)}
      />
      <ChipGroup
        title="Favorite activities"
        options={FAVORITE_ACTIVITIES}
        selected={profile.activities}
        onToggle={(id) => onToggle('activities', id)}
        withEmoji
      />

      {/* community */}
      <div className="profile__section">
        <span className="profile__section-title">
          <Users size={14} aria-hidden="true" /> Connect with the community
        </span>
        <p className="profile__community-copy">People here for a calmer, kinder feed. Connect to do challenges and chat.</p>
        <ul className="profile__community">
          {community.map((person) => (
            <li key={person.id} className="community-card">
              <span className="community-card__avatar" aria-hidden="true">{person.emoji}</span>
              <div className="community-card__body">
                <span className="community-card__name">{person.displayName}</span>
                <span className="community-card__bio">{person.bio}</span>
                <div className="community-card__tags">
                  {(person.goals || []).slice(0, 2).map((id) => goalById(id)).filter(Boolean).map((goal) => (
                    <span key={goal.id} className="community-card__tag">{goal.emoji} {goal.label}</span>
                  ))}
                  {(person.interests || []).slice(0, 2).map((id) => interestById(id)).filter(Boolean).map((interest) => (
                    <span key={interest.id} className="community-card__tag community-card__tag--soft">{interest.label}</span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className={`community-card__connect${person.isConnected ? ' is-connected' : ''}`}
                onClick={() => connect(person)}
                disabled={person.isFriend}
              >
                {person.isFriend ? (<><Check size={13} aria-hidden="true" /> Friends</>)
                  : person.isConnected ? (<><Check size={13} aria-hidden="true" /> Connected</>)
                    : (<><UserPlus size={13} aria-hidden="true" /> Connect</>)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="profile__footnote">No follower counts. No popularity ranking. Just meaningful connection.</p>
    </section>
  );
}

function ChipGroup({ title, options, selected, onToggle, withEmoji }) {
  const set = new Set(selected || []);
  return (
    <div className="profile__section">
      <span className="profile__section-title">{title}</span>
      <div className="profile__chips">
        {options.map((option) => {
          const on = set.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={`profile-chip${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(option.id)}
            >
              {withEmoji && option.emoji ? `${option.emoji} ` : ''}{option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
