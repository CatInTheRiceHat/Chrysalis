import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intentional_social/data/app_store.dart';
import 'package:intentional_social/domain/app_controller.dart';
import 'package:intentional_social/domain/feed.dart';
import 'package:intentional_social/domain/session.dart';
import 'package:intentional_social/main.dart';
import 'package:intentional_social/ui/reel_post.dart';

class MemoryStore implements AppStore {
  Map<String, dynamic>? value;
  @override
  Future<Map<String, dynamic>?> read() async => value;
  @override
  Future<void> write(Map<String, dynamic> value) async {
    this.value = value;
  }
}

void main() {
  late Duration now;
  late AppController c;
  setUp(() {
    now = Duration.zero;
    c = AppController(
      store: MemoryStore(),
      session: SessionEngine(
        monotonicNow: () => now,
        wallNow: () => DateTime(2026, 9, 6).add(now),
      ),
    );
  });
  tearDown(() => c.dispose());

  Future<void> launch(
    WidgetTester tester, {
    Size size = const Size(1000, 1000),
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(ChrysalisApp(controller: c, enableTicker: false));
    await tester.pumpAndSettle();
  }

  Future<void> tapText(WidgetTester tester, String text) async {
    final target = find.text(text).last;
    await tester.ensureVisible(target);
    await tester.tap(target);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'setup, custom validation, goal choice, extension, reflection and history',
    (tester) async {
      await launch(tester);
      await tapText(tester, 'Custom');
      await tester.enterText(find.byKey(const Key('custom-minutes')), '0');
      await tapText(tester, 'Use duration');
      expect(find.text('Enter 1 to 1440 minutes.'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('custom-minutes')), '1');
      await tapText(tester, 'Use duration');
      await tapText(tester, 'Begin my session');
      expect(c.session.target, const Duration(minutes: 1));
      now = const Duration(minutes: 1);
      c.tick();
      await tester.pumpAndSettle();
      expect(find.text('A moment to choose'), findsOneWidget);
      await tapText(tester, 'Add time');
      await tester.enterText(find.byKey(const Key('custom-minutes')), '2');
      await tapText(tester, 'Use duration');
      expect(c.session.target, const Duration(minutes: 3));
      expect(c.session.phase, SessionPhase.running);
      await tester.tap(find.byTooltip('End session'));
      await tester.pumpAndSettle();
      expect(
        find.text('Did this session match what you wanted?'),
        findsOneWidget,
      );
      await tapText(tester, 'Somewhat');
      await tapText(tester, 'History');
      expect(find.text('Somewhat'), findsOneWidget);
      expect(c.session.history.single.actual, const Duration(minutes: 1));
      await tapText(tester, 'Clear history');
      await tapText(tester, 'Clear history');
      expect(c.session.history, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'preference drafts do not affect feed until apply and undo restores order',
    (tester) async {
      await launch(tester);
      final before = c.preferences;
      await tapText(tester, 'Preferences');
      await tapText(tester, 'Chronological');
      expect(c.preferences, same(before));
      expect(find.text('Current feed'), findsOneWidget);
      expect(find.text('Your preview'), findsOneWidget);
      await tapText(tester, 'Apply to my feed');
      expect(c.preferences.order, FeedOrder.chronological);
      await tapText(tester, 'Undo last change');
      expect(c.preferences, same(before));
      await tapText(tester, 'Science');
      expect(c.preferences.selectedTopics, isNot(contains('Science')));
      await tapText(tester, 'Apply to my feed');
      expect(c.preferences.selectedTopics, contains('Science'));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'skip setup, feed endpoint, why explanation and pause lifecycle',
    (tester) async {
      await launch(tester, size: const Size(390, 844));
      await tapText(tester, 'Skip setup');
      expect(c.session.target, isNull);
      expect(find.text('A natural stopping point.'), findsOneWidget);
      expect(find.byType(PostCard), findsNWidgets(10));
      await tapText(tester, 'Load 2 more');
      expect(find.byType(PostCard), findsNWidgets(12));
      expect(find.text('You’ve seen this collection.'), findsOneWidget);
      expect(find.text('Load 2 more'), findsNothing);
      final why = find.byTooltip('Why am I seeing this?').first;
      await tester.ensureVisible(why);
      await tester.tap(why);
      await tester.pumpAndSettle();
      expect(
        find.textContaining('You follow Maya Chen (+2 priority).'),
        findsOneWidget,
      );
      await tapText(tester, 'Got it');
      await tester.tap(find.byTooltip('Pause session'));
      await tester.pumpAndSettle();
      now = const Duration(minutes: 8);
      c.tick();
      expect(c.session.active, Duration.zero);
      await tester.tap(find.byTooltip('Resume session'));
      await tester.pumpAndSettle();
      now += const Duration(seconds: 10);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      now += const Duration(minutes: 10);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      expect(c.session.active, const Duration(seconds: 10));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'matching break uses active time and can be adjusted or ended early',
    (tester) async {
      c.breakMode = BreakMode.matching;
      c.session.start('Learn', const Duration(minutes: 20));
      now = const Duration(minutes: 2);
      c.tick();
      await launch(tester, size: const Size(390, 844));
      await tapText(tester, 'Session controls');
      await tapText(tester, 'Take a break');
      expect(find.text('Match your break to your time spent.'), findsOneWidget);
      await tapText(tester, 'Match active time');
      expect(c.session.phase, SessionPhase.onBreak);
      expect(c.session.breakRemaining, const Duration(minutes: 2));
      await tapText(tester, 'Adjust break');
      await tester.enterText(find.byKey(const Key('custom-minutes')), '3');
      await tapText(tester, 'Use duration');
      expect(c.session.breakRemaining, const Duration(minutes: 3));
      await tapText(tester, 'End break early');
      expect(c.session.phase, SessionPhase.paused);
      expect(c.session.active, const Duration(minutes: 2));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'session controls can edit and end without leaving a stale dialog',
    (tester) async {
      c.session.start('Learn', const Duration(minutes: 5));
      await launch(tester, size: const Size(390, 844));
      await tapText(tester, 'Session controls');
      await tapText(tester, 'Edit intention & time');
      await tapText(tester, 'Browse');
      await tapText(tester, '30 min');
      await tapText(tester, 'Save session settings');
      expect(c.session.intention, 'Browse');
      expect(c.session.target, const Duration(minutes: 30));
      await tapText(tester, 'Session controls');
      await tapText(tester, 'End session');
      expect(c.session.phase, SessionPhase.reflecting);
      expect(
        find.text('Did this session match what you wanted?'),
        findsOneWidget,
      );
      expect(find.byTooltip('Close session controls'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'narrow screen, large text and dark mode have no layout exceptions',
    (tester) async {
      c.themeMode = ThemeMode.dark;
      tester.platformDispatcher.textScaleFactorTestValue = 2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await launch(tester, size: const Size(375, 900));
      expect(tester.takeException(), isNull);
      await tapText(tester, 'Skip setup');
      expect(tester.takeException(), isNull);
      await tapText(tester, 'Preferences');
      expect(tester.takeException(), isNull);
      await tapText(tester, 'History');
      expect(tester.takeException(), isNull);
    },
  );
}
