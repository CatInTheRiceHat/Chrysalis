import 'package:flutter/material.dart';

import '../data/sample_posts.dart';
import '../domain/app_controller.dart';
import '../domain/feed.dart';
import '../domain/session.dart';
import 'session_controls.dart';
import 'theme.dart';

class PreferencesPage extends StatefulWidget {
  const PreferencesPage({super.key, required this.controller});
  final AppController controller;
  @override
  State<PreferencesPage> createState() => _PreferencesPageState();
}

class _PreferencesPageState extends State<PreferencesPage> {
  late Set<String> draftTopics = {
    ...widget.controller.preferences.selectedTopics,
  };
  late FeedOrder draftOrder = widget.controller.preferences.order;
  FeedPreferences get draft =>
      FeedPreferences(selectedTopics: draftTopics, order: draftOrder);
  void resetDraft() => setState(() {
    draftTopics = {...widget.controller.preferences.selectedTopics};
    draftOrder = widget.controller.preferences.order;
  });

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const PageHeading(
          'The controls are yours',
          'Shape your feed.',
          'Try a different perspective. Preview what changes before you apply it.',
        ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'What would you like to see more of?',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              const Text(
                'Topics move posts up in the recommended feed. They do not hide other topics.',
              ),
              const SizedBox(height: 18),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final topic in topics)
                    FilterChip(
                      label: Text(topic),
                      selected: draftTopics.contains(topic),
                      onSelected: (selected) => setState(() {
                        selected
                            ? draftTopics.add(topic)
                            : draftTopics.remove(topic);
                      }),
                    ),
                ],
              ),
              const Divider(),
              Text(
                'Choose your order',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  ChoiceChip(
                    label: const Text('Following + topics'),
                    selected: draftOrder == FeedOrder.recommended,
                    onSelected: (_) =>
                        setState(() => draftOrder = FeedOrder.recommended),
                  ),
                  ChoiceChip(
                    label: const Text('Chronological'),
                    selected: draftOrder == FeedOrder.chronological,
                    onSelected: (_) =>
                        setState(() => draftOrder = FeedOrder.chronological),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                draftOrder == FeedOrder.chronological
                    ? 'Newest first. Your topic choices stay saved, but do not affect chronological order.'
                    : 'Followed account: +2 priority. Selected topic: +1. Higher totals appear first; ties use newest first. Reactions and time spent never affect this order.',
              ),
              const SizedBox(height: 10),
              Text(
                'Fixed sample follows: Maya Chen, Jules Rivera, Sam Okafor. All profiles are fictional.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const SizedBox(height: 28),
        const Eyebrow('Preview / first four posts'),
        const SizedBox(height: 12),
        const Text(
          'Your live feed stays as it is until you apply these changes.',
        ),
        const SizedBox(height: 20),
        LayoutBuilder(
          builder: (context, constraints) {
            final current = _Preview(
              title: 'Current feed',
              preferences: c.preferences,
            );
            final proposed = _Preview(
              title: 'Your preview',
              preferences: draft,
            );
            return constraints.maxWidth > 670
                ? Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: current),
                      const SizedBox(width: 18),
                      Expanded(child: proposed),
                    ],
                  )
                : Column(
                    children: [current, const SizedBox(height: 16), proposed],
                  );
          },
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            FilledButton.icon(
              key: const Key('apply-preferences'),
              onPressed: () {
                c.applyPreferences(draft);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Text('Feed preferences applied.'),
                    action: SnackBarAction(
                      label: 'Undo',
                      onPressed: () {
                        c.undoPreferences();
                        if (mounted) resetDraft();
                      },
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.check, size: 19),
              label: const Text('Apply to my feed'),
            ),
            OutlinedButton(
              onPressed: resetDraft,
              child: const Text('Reset preview'),
            ),
            if (c.canUndoPreferences)
              TextButton(
                onPressed: () {
                  c.undoPreferences();
                  resetDraft();
                },
                child: const Text('Undo last change'),
              ),
          ],
        ),
        const SizedBox(height: 40),
        const Divider(),
        const PageHeading(
          'Session preferences',
          'Leave room for a pause.',
          'Break suggestions are optional. Choose what fits, and change it whenever you like.',
        ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Eyebrow('Break mode'),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final mode in BreakMode.values)
                    ChoiceChip(
                      label: Text(switch (mode) {
                        BreakMode.off => 'Off',
                        BreakMode.matching => 'Match active time',
                        BreakMode.custom => 'Custom break',
                      }),
                      selected: c.breakMode == mode,
                      onSelected: (_) => c.change(() => c.breakMode = mode),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              if (c.breakMode == BreakMode.matching) ...[
                Text(
                  'Match your break to your time spent.',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 10),
                const Text(
                  'An experimental, user-selected rule. For example, 20 minutes of active use suggests a 20-minute break. The suggestion uses actual active time, including extensions. You always choose whether to start it.',
                ),
              ] else if (c.breakMode == BreakMode.custom) ...[
                Text(
                  'Your usual break: ${c.customBreak.inMinutes} minutes',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                TextButton(
                  onPressed: () async {
                    final d = await askDuration(
                      context,
                      title: 'Your usual break',
                      initial: c.customBreak.inMinutes,
                    );
                    if (d != null) c.change(() => c.customBreak = d);
                  },
                  child: const Text('Change custom break'),
                ),
              ] else
                const Text(
                  'No matching-break rule is enabled. You can still choose Take a break during any session.',
                ),
              const SizedBox(height: 16),
              const Text(
                'A break is time away from this app. We do not monitor other apps or verify time off your phone. You can adjust a break or end it early.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Appearance', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final mode in ThemeMode.values)
                    ChoiceChip(
                      label: Text(switch (mode) {
                        ThemeMode.system => 'System',
                        ThemeMode.light => 'Light',
                        ThemeMode.dark => 'Dark',
                      }),
                      selected: c.themeMode == mode,
                      onSelected: (_) => c.change(() => c.themeMode = mode),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              const Text(
                'Your preferences and session history stay on this device. No account, backend, or external analytics.',
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({required this.title, required this.preferences});
  final String title;
  final FeedPreferences preferences;
  @override
  Widget build(BuildContext context) => SectionCard(
    padding: 20,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 20),
        for (final (index, post) in rankFeed(
          samplePosts,
          preferences,
        ).take(4).indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '0${index + 1}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post.title,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        '${post.name} · ${post.topic}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        preferences.order == FeedOrder.chronological
                            ? 'Publication order · newest first'
                            : '${post.followed ? 'Following +2' : 'Discovery +0'}${preferences.selectedTopics.contains(post.topic) ? ' · Topic +1' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    ),
  );
}
