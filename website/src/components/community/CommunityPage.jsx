import { useEffect, useMemo, useState } from 'react';
import { HomeShell } from '../home/HomeShell';
import { CommunityHeader } from './CommunityHeader';
import { FriendSwipeDeck } from './FriendSwipeDeck';
import { GoodThingsLeaderboard } from './GoodThingsLeaderboard';
import { TouchGrassChallenges } from './TouchGrassChallenges';
import { YourCircle } from './YourCircle';
import { SafetyNote } from './SafetyNote';
import {
  CHALLENGES,
  LEADERBOARD,
  STARTER_CIRCLE,
} from './communityData';
import '../../community.css';

/**
 * Chrysalis Community — make friends through shared goals, offline activities,
 * and wellness challenges, with a leaderboard that rewards healthy actions
 * instead of popularity.
 *
 * Reuses the social-app chrome via <HomeShell active="community"> so it feels
 * like one app with Home and the feed. All interactive state lives here and is
 * frontend-only (no backend): the friend deck index, the user's circle, the set
 * of completed challenges, and the Dewdrops earned this session. Completing a
 * challenge bumps the header stat and re-ranks the leaderboard live.
 */
const BASE_WEEK_DEWDROPS = 128; // header "earned this week" starting figure
const SELF_BASE_SCORE = 310; // the "You" leaderboard row's starting Dewdrops

export function CommunityPage() {
  const [deckIndex, setDeckIndex] = useState(0);
  const [lastConnected, setLastConnected] = useState(null);
  const [circle, setCircle] = useState(STARTER_CIRCLE);
  const [completed, setCompleted] = useState(() => new Set());
  const [earnedDewdrops, setEarnedDewdrops] = useState(0);
  const [circleNote, setCircleNote] = useState(null);

  // Auto-clear the transient confirmations so they read as gentle, not sticky.
  useEffect(() => {
    if (!lastConnected) return undefined;
    const t = window.setTimeout(() => setLastConnected(null), 3200);
    return () => window.clearTimeout(t);
  }, [lastConnected]);

  useEffect(() => {
    if (!circleNote) return undefined;
    const t = window.setTimeout(() => setCircleNote(null), 3200);
    return () => window.clearTimeout(t);
  }, [circleNote]);

  const handleDecision = (candidate, decision) => {
    if (decision === 'connect') {
      setLastConnected(candidate.name);
      setCircle((prev) =>
        prev.some((m) => m.id === candidate.id)
          ? prev
          : [
              ...prev,
              {
                id: candidate.id,
                name: candidate.name,
                emoji: candidate.emoji,
                circleGoal: candidate.circleGoal,
                activity: candidate.activity,
              },
            ],
      );
    }
    setDeckIndex((i) => i + 1);
  };

  const handleComplete = (challenge) => {
    if (completed.has(challenge.id)) return;
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(challenge.id);
      return next;
    });
    setEarnedDewdrops((d) => d + challenge.reward);
  };

  const handleGuidedAction = (member, kind) => {
    setCircleNote(
      kind === 'invite'
        ? `You invited ${member.name} to a challenge. 🌿`
        : `You sent ${member.name} some encouragement. 💜`,
    );
  };

  // The "You" row grows with earned Dewdrops; re-sort so rank reflects action.
  const leaderboardRows = useMemo(() => {
    return LEADERBOARD.map((row) =>
      row.isSelf ? { ...row, dewdrops: SELF_BASE_SCORE + earnedDewdrops } : row,
    ).sort((a, b) => b.dewdrops - a.dewdrops);
  }, [earnedDewdrops]);

  const completedCount = completed.size;
  const completedAll = completedCount === CHALLENGES.length;

  return (
    <HomeShell active="community">
      <div className="cmty-page">
        <CommunityHeader dewdropsThisWeek={BASE_WEEK_DEWDROPS + earnedDewdrops} />

        <div className="cmty-grid">
          <div className="cmty-col cmty-col--main">
            <FriendSwipeDeck
              index={deckIndex}
              lastConnected={lastConnected}
              onDecision={handleDecision}
            />
            <TouchGrassChallenges completed={completed} onComplete={handleComplete} />
            {completedAll && (
              <p className="cmty-note cmty-note--inline">
                Every challenge done today — that’s real Dewdrops, not screen time. 🌿
              </p>
            )}
          </div>

          <div className="cmty-col cmty-col--side">
            <GoodThingsLeaderboard rows={leaderboardRows} />
            <YourCircle
              members={circle}
              onGuidedAction={handleGuidedAction}
              note={circleNote}
            />
          </div>
        </div>

        <SafetyNote />
      </div>
    </HomeShell>
  );
}
