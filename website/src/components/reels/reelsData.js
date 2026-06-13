/**
 * Content for the Chrysalis "Flutter Feed" (/reels) — grouped by mode.
 *
 * This is a wellbeing feed, not an entertainment feed. Three modes:
 *   daily-dew     — short, grounding, positive daily drop (light & quick)
 *   metamorphosis — screen-time regulation: pause, breathe, notice scrolling
 *   flutter-feed  — a healthier personalized feed with more user control
 *
 * To add / edit a card: append or modify an object inside the relevant array
 * of `reelsByMode`. Each card supports:
 *   id          unique string within its mode (used as React key)
 *   title       headline shown in the bottom caption
 *   source      creator / origin line
 *   label       wellbeing tag shown as the accent chip
 *   description short supporting line
 *   image       path under /public (omit to render the branded gradient wash)
 *   reason      why this reached you — reserved for the rail "Why am I seeing
 *               this?" action (stored now, not yet displayed)
 */

export const MODES = [
  { key: 'daily-dew',     label: 'Daily Dew',          blurb: 'A short daily drop of grounding, positive content.' },
  { key: 'metamorphosis', label: 'Metamorphosis', blurb: 'Slow down, pause, breathe, notice your scrolling.' },
  { key: 'flutter-feed',  label: 'Flutter Feed',       blurb: 'A healthier personalized feed, with more control.' },
];

export const DEFAULT_MODE = 'flutter-feed';

/** Onboarding intentions → which mode each one opens. */
export const INTENTIONS = [
  {
    id: 'reset',
    icon: '🌅',
    mode: 'daily-dew',
    title: 'I want a small positive reset.',
    description: 'A light, quick grounding drop to start fresh.',
  },
  {
    id: 'lesstime',
    icon: '🦋',
    mode: 'metamorphosis',
    title: 'I want to spend less time scrolling.',
    description: 'Gentle nudges to pause, breathe, and step away.',
  },
  {
    id: 'healthier',
    icon: '🌸',
    mode: 'flutter-feed',
    title: 'I want a healthier version of my normal feed.',
    description: 'Your usual feed, balanced for positivity and diversity.',
  },
];

export const reelsByMode = {
  'daily-dew': [
    {
      id: 'tiny-reset',
      title: 'A tiny reset',
      source: '@chrysalis · Daily Dew',
      label: 'Grounding',
      description: 'One slow breath in, one slow breath out. That’s the whole post.',
      image: '/images/daily-dew.png',
      reason: 'A gentle opener chosen to ease you in, not to hook you.',
    },
    {
      id: 'one-kind-thought',
      title: 'One kind thought before you scroll',
      source: '@chrysalis · Daily Dew',
      label: 'Self-love',
      description: 'You’re allowed to be a work in progress and still be worthy today.',
      image: '/images/journey-egg.png',
      reason: 'Prosocial, low-stimulation content surfaced for your morning reset.',
    },
    {
      id: 'gratitude',
      title: 'Notice one thing you’re grateful for',
      source: '@chrysalis · Daily Dew',
      label: 'Reflection',
      description: 'Small or silly counts. Warm coffee. A text back. Quiet for a minute.',
      image: '/images/hero-butterfly.png',
      reason: 'A reflective prompt to close your daily drop on a grounded note.',
    },
  ],
  'metamorphosis': [
    {
      id: 'cocoon-break',
      title: 'Take a cocoon break',
      source: '@chrysalis · Metamorphosis',
      label: 'Rest',
      description: 'You’ve been here a while. Breathe, look up, and come back when you’re ready.',
      image: '/images/journey-chrysalis.png',
      reason: 'Surfaced because your session is running long — a nudge to pause.',
    },
    {
      id: 'scrolling-a-bit',
      title: 'You’ve been scrolling for a bit',
      source: '@chrysalis · Metamorphosis',
      label: 'Awareness',
      description: 'No judgment — just a gentle marker. How are your eyes and shoulders feeling?',
      image: '/images/journey-caterpillar.png',
      reason: 'A screen-time check-in placed to help you notice the pattern.',
    },
    {
      id: 'breathe',
      title: 'Breathe before the next post',
      source: '@chrysalis · Metamorphosis',
      label: 'Pause',
      description: 'In for four, hold for four, out for four. The feed will wait for you.',
      image: '/images/metamorphosis.png',
      reason: 'A deliberate pause card that slows the pace between reels.',
    },
  ],
  'flutter-feed': [
    {
      id: 'healthier-feed',
      title: 'A healthier personalized feed',
      source: '@chrysalis · Flutter Feed',
      label: 'Balance',
      description: 'Tuned to what you like — and tuned away from what quietly wears you down.',
      image: '/images/flutter-feed.png',
      reason: 'Personalized to your interests with positivity and diversity weighted in.',
    },
    {
      id: 'regenerate',
      title: 'Regenerate this feed',
      source: '@chrysalis · Controls',
      label: 'Your call',
      description: 'Not feeling it? Reshuffle with a fresh blend of topics and tones in one tap.',
      image: '/images/journey-emerged.png',
      reason: 'You’re always in control — regenerate whenever the mix feels off.',
    },
    {
      id: 'balance',
      title: 'Balance positivity, diversity, and self-love',
      source: '@chrysalis · For you',
      label: 'Prosocial',
      description: 'Every recommendation weighs how it makes you feel — not just what keeps you tapping.',
      image: '/images/hero-butterfly.png',
      reason: 'Ranked by relevance, diversity, prosocial value, and a risk shield.',
    },
  ],
};
