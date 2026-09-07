import 'package:flutter/material.dart';

import '../domain/app_controller.dart';
import '../domain/session.dart';
import 'feed_page.dart';
import 'butterfly.dart';
import 'history_page.dart';
import 'preferences_page.dart';
import 'session_controls.dart';
import 'theme.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.controller});
  final AppController controller;
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selected = 0;
  bool goalOpen = false;
  final scroll = ScrollController();
  late SessionPhase previousPhase = widget.controller.session.phase;
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_changed);
    WidgetsBinding.instance.addPostFrameCallback((_) => _changed());
  }

  @override
  void dispose() {
    widget.controller.removeListener(_changed);
    scroll.dispose();
    super.dispose();
  }

  void _changed() {
    if (!mounted) return;
    final s = widget.controller.session;
    if (s.phase != previousPhase) {
      final simplePause = {
        s.phase,
        previousPhase,
      }.every((p) => p == SessionPhase.running || p == SessionPhase.paused);
      previousPhase = s.phase;
      if (!simplePause) {
        setState(() => selected = 0);
        if (scroll.hasClients) scroll.jumpTo(0);
      }
    }
    if (s.goalPending && s.foreground && !goalOpen) {
      goalOpen = true;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        if (!s.goalPending || !s.foreground) {
          goalOpen = false;
          return;
        }
        widget.controller.change(s.dismissGoal);
        final choice = await showDialog<String>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('A moment to choose'),
            content: const SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('You’ve reached your intended time.'),
                  SizedBox(height: 12),
                  Text(
                    'What would you like to do next? More time is a choice, too. Your session keeps running unless you pause, take a break, or end it.',
                  ),
                ],
              ),
            ),
            actions: [
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'end'),
                child: const Text('End session'),
              ),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'break'),
                child: const Text('Take a break'),
              ),
              OutlinedButton(
                onPressed: () => Navigator.pop(context, 'add'),
                child: const Text('Add time'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Keep browsing'),
              ),
            ],
          ),
        );
        goalOpen = false;
        if (!mounted || !s.hasSession) return;
        if (choice == 'end') widget.controller.change(s.end);
        if (choice == 'break') await chooseBreak(context, widget.controller);
        if (choice == 'add' && mounted) {
          await addTime(context, widget.controller);
        }
      });
    }
  }

  void navigate(int index) {
    setState(() => selected = index);
    if (scroll.hasClients) scroll.jumpTo(0);
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final wide = MediaQuery.sizeOf(context).width >= 1180;
    final page = switch (selected) {
      1 => PreferencesPage(controller: c),
      2 => HistoryPage(controller: c),
      _ => FeedPage(controller: c, onPreferences: () => navigate(1)),
    };
    return Scaffold(
      bottomNavigationBar: wide
          ? null
          : NavigationBar(
              selectedIndex: selected,
              onDestinationSelected: navigate,
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home),
                  label: 'My feed',
                ),
                NavigationDestination(
                  icon: Icon(Icons.tune),
                  label: 'Preferences',
                ),
                NavigationDestination(
                  icon: Icon(Icons.history),
                  label: 'History',
                ),
              ],
            ),
      body: SafeArea(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (wide)
              Container(
                width: 236,
                padding: const EdgeInsets.fromLTRB(14, 20, 14, 24),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  border: Border(
                    right: BorderSide(
                      color: Theme.of(context).colorScheme.outlineVariant,
                    ),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(left: 12),
                      child: _Brand(),
                    ),
                    const SizedBox(height: 18),
                    if (c.session.hasSession)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 18),
                        child: OutlinedButton(
                          onPressed: () => openSessionControls(context, c),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'YOUR INTENTION',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(fontSize: 10),
                              ),
                              Text(
                                c.session.intention,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    for (final (i, label, icon) in [
                      (0, 'My feed', Icons.home_outlined),
                      (1, 'Preferences', Icons.tune),
                      (2, 'History', Icons.history),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          selected: selected == i,
                          selectedTileColor: Colors.transparent,
                          selectedColor: Theme.of(context)
                              .colorScheme
                              .onSurface,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          leading: Icon(icon),
                          title: Text(
                            label,
                            style: const TextStyle(fontSize: 15),
                          ),
                          onTap: () => navigate(i),
                        ),
                      ),
                    const Spacer(),
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [Eyebrow('On-device prototype')],
                      ),
                    ),
                  ],
                ),
              ),
            Expanded(
              child: Column(
                children: [
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: wide ? 40 : 20,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: Theme.of(context).colorScheme.outlineVariant,
                        ),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: !wide
                              ? const _Brand()
                              : Text(
                                  [
                                    'Your space',
                                    'Your preferences',
                                    'Your history',
                                  ][selected],
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                        ),
                        IconButton(
                          tooltip: 'Switch light or dark theme',
                          onPressed: () => c.change(() {
                            c.themeMode =
                                Theme.of(context).brightness == Brightness.dark
                                ? ThemeMode.light
                                : ThemeMode.dark;
                          }),
                          icon: Icon(
                            Theme.of(context).brightness == Brightness.dark
                                ? Icons.light_mode_outlined
                                : Icons.dark_mode_outlined,
                          ),
                        ),
                        const SizedBox(width: 10),
                        IconButton(
                          tooltip: 'About this prototype',
                          onPressed: () => showDialog<void>(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('A space to practice choosing'),
                              content: const SingleChildScrollView(
                                child: Text(
                                  'Chrysalis is a social prototype for setting intentions, noticing behavior, and making independent choices.\n\nAll profiles, posts, and artwork are bundled samples. Recommendations use fixed, visible rules. There is no AI or external analytics.\n\nMore time is not a failure. This app does not claim to improve mental health or monitor other apps. Preferences and history are stored on this device.',
                                ),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text('Close'),
                                ),
                              ],
                            ),
                          ),
                          icon: const Icon(Icons.info_outline, size: 21),
                        ),
                      ],
                    ),
                  ),
                  if (c.session.hasSession)
                    _SessionStrip(controller: c, onSession: () => navigate(0)),
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scroll,
                      padding: EdgeInsets.fromLTRB(
                        wide ? 40 : 20,
                        32,
                        wide ? 40 : 20,
                        48,
                      ),
                      child: Align(
                        alignment: Alignment.topCenter,
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 1100),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (c.storageError != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 20),
                                  child: SectionCard(
                                    child: Text(c.storageError!),
                                  ),
                                ),
                              page,
                            ],
                          ),
                        ),
                      ),
                    ),
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

class _Brand extends StatelessWidget {
  const _Brand();
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      const ButterflyMark(size: 34),
      const SizedBox(width: 9),
      Flexible(
        child: Text(
          'Chrysalis',
          style: TextStyle(
            fontFamily: 'Abril Fatface',
            fontSize: 24,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
      ),
    ],
  );
}

class _SessionStrip extends StatelessWidget {
  const _SessionStrip({required this.controller, required this.onSession});
  final AppController controller;
  final VoidCallback onSession;
  @override
  Widget build(BuildContext context) {
    final s = controller.session;
    final isBreak = s.phase == SessionPhase.onBreak;
    final paused = s.phase == SessionPhase.paused;
    return Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: TextButton(
              onPressed: onSession,
              style: TextButton.styleFrom(alignment: Alignment.centerLeft),
              child: Semantics(
                label: isBreak
                    ? 'Break, ${clockText(s.breakRemaining)} remaining'
                    : '${paused ? 'Paused' : 'Running'}, ${clockText(s.active)} active, ${s.remaining == null ? 'no time goal' : '${clockText(s.remaining!)} remaining'}',
                excludeSemantics: true,
                child: Text(
                  isBreak
                      ? 'Break · ${clockText(s.breakRemaining)} left'
                      : '${paused ? 'Paused' : 'Session'} · ${clockText(s.active)} active${s.remaining == null ? '' : ' · ${clockText(s.remaining!)} left'}',
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            ),
          ),
          if (!isBreak)
            IconButton(
              tooltip: paused ? 'Resume session' : 'Pause session',
              onPressed: () => controller.change(paused ? s.resume : s.pause),
              icon: Icon(
                paused ? Icons.play_arrow_outlined : Icons.pause,
                size: 20,
              ),
            ),
          IconButton(
            tooltip: 'End session',
            onPressed: () => controller.change(s.end),
            icon: const Icon(Icons.stop_circle_outlined, size: 20),
          ),
        ],
      ),
    );
  }
}
