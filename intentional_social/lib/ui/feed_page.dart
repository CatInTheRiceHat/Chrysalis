import 'package:flutter/material.dart';

import '../data/sample_posts.dart';
import '../domain/app_controller.dart';
import '../domain/feed.dart';
import '../domain/session.dart';
import 'reel_post.dart';

import 'session_controls.dart';
import 'theme.dart';

class FeedPage extends StatefulWidget {
  const FeedPage({
    super.key,
    required this.controller,
    required this.onPreferences,
  });
  final AppController controller;
  final VoidCallback onPreferences;
  @override
  State<FeedPage> createState() => _FeedPageState();
}

class _FeedPageState extends State<FeedPage> {
  static const batchSize = 10;
  int visible = batchSize;
  FeedPreferences? previousPreferences;
  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final session = c.session;
    if (session.phase == SessionPhase.idle) return _welcome(context);
    if (session.phase == SessionPhase.reflecting) return _reflection(context);
    if (session.phase == SessionPhase.onBreak) return _break(context);
    if (previousPreferences != c.preferences) {
      previousPreferences = c.preferences;
      visible = batchSize;
    }
    final posts = rankFeed(samplePosts, c.preferences);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Wrap(
          spacing: 16,
          runSpacing: 8,
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              c.preferences.order == FeedOrder.chronological
                  ? 'Newest first'
                  : 'Following + your topics',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            TextButton.icon(
              onPressed: () => openSessionControls(context, c),
              icon: const Icon(Icons.tune, size: 18),
              label: const Text('Session controls'),
            ),
          ],
        ),
        if (c.restoredSession)
          _notice(
            context,
            'Your saved session is paused. Choose Resume when you’re ready.',
            () => c.change(() => c.restoredSession = false),
          ),
        if (session.breakFinished)
          _notice(
            context,
            'Your break has ended. Your session stays paused until you resume.',
            () => c.change(() => session.breakFinished = false),
          ),
        for (final (index, post) in posts.take(visible).indexed)
          PostCard(
            key: ValueKey(post.id),
            post: post,
            preferences: c.preferences,
            position: index + 1,
          ),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: SectionCard(
              child: Column(
                children: [
                  Text(
                    visible < posts.length
                        ? 'A natural stopping point.'
                        : 'You’ve seen this collection.',
                    style: Theme.of(context).textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    visible < posts.length
                        ? 'That’s this set of posts. Choose another set whenever you want.'
                        : 'All ${posts.length} sample posts. Your next step is yours.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    alignment: WrapAlignment.center,
                    children: [
                      OutlinedButton(
                        onPressed: () => c.change(session.end),
                        child: const Text('End session'),
                      ),
                      if (visible < posts.length)
                        FilledButton(
                          onPressed: () => setState(() => visible += batchSize),
                          child: Text(
                            'Load ${(posts.length - visible).clamp(1, batchSize)} more',
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _notice(BuildContext context, String text, VoidCallback onDismiss) =>
      SectionCard(
        padding: 16,
        child: Row(
          children: [
            const Icon(Icons.info_outline),
            const SizedBox(width: 12),
            Expanded(child: Text(text)),
            IconButton(
              tooltip: 'Dismiss notice',
              onPressed: onDismiss,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
      );

  Widget _welcome(BuildContext context) {
    final c = widget.controller;
    final form = SectionCard(
      padding: MediaQuery.sizeOf(context).width < 450 ? 20 : 32,
      child: IntentionForm(
        intention: c.defaultIntention,
        duration: c.defaultDuration,
        onSubmit: (i, d) => c.change(() {
          c.defaultIntention = i;
          c.defaultDuration = d;
          c.session.start(i, d);
          visible = batchSize;
        }),
        onSkip: () => c.change(() {
          c.session.start('Browse', null);
          visible = batchSize;
        }),
      ),
    );
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 760),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const PageHeading(
              'Your intention',
              'Choose your session.',
              'Decide what you’re here for, or skip setup and explore.',
            ),
            form,
            const SizedBox(height: 24),
            Text(
              'Fictional sample content. On-device history. Your time, your choice.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _reflection(BuildContext context) {
    final s = widget.controller.session;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 650),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const PageHeading(
              'Session complete',
              'A moment to look back.',
              'Reflection is optional. There is no right answer.',
            ),
            SectionCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Eyebrow('You came here to'),
                  const SizedBox(height: 12),
                  Text(
                    s.intention,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${clockText(s.active)} active · ${s.originalPlan == null ? 'no planned duration' : '${clockText(s.originalPlan!)} originally planned'}',
                  ),
                  const Divider(),
                  Text(
                    'Did this session match what you wanted?',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      for (final answer in ['Yes', 'Somewhat', 'No'])
                        OutlinedButton(
                          onPressed: () =>
                              widget.controller.change(() => s.reflect(answer)),
                          child: Text(answer),
                        ),
                      TextButton(
                        onPressed: () =>
                            widget.controller.change(() => s.reflect(null)),
                        child: const Text('Skip'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Your session is saved privately on this device. You can clear your history at any time.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _break(BuildContext context) {
    final c = widget.controller;
    final s = c.session;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 650),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const PageHeading(
              'Time away',
              'Make a little space.',
              'Your session is paused. There’s nothing you need to do here.',
            ),
            SectionCard(
              padding: 32,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.free_breakfast_outlined, size: 44),
                  const SizedBox(height: 24),
                  Semantics(
                    label: '${clockText(s.breakRemaining)} of break remaining',
                    excludeSemantics: true,
                    child: Text(
                      clockText(s.breakRemaining),
                      style: Theme.of(context).textTheme.displaySmall,
                    ),
                  ),
                  const Text('break remaining'),
                  const SizedBox(height: 24),
                  const Text(
                    'Feel free to leave this app. The break timer continues while you’re away. It does not monitor other apps or verify time off your phone.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 28),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    alignment: WrapAlignment.center,
                    children: [
                      OutlinedButton(
                        onPressed: () async {
                          final d = await askDuration(
                            context,
                            title: 'Adjust your break',
                            detail: 'Set the remaining break time from now.',
                            initial: s.breakRemaining.inMinutes.clamp(1, 1440),
                          );
                          if (d != null) c.change(() => s.adjustBreak(d));
                        },
                        child: const Text('Adjust break'),
                      ),
                      FilledButton(
                        onPressed: () => c.change(s.endBreak),
                        child: const Text('End break early'),
                      ),
                      TextButton(
                        onPressed: () => c.change(s.end),
                        child: const Text('End session'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Active session time: ${clockText(s.active)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
