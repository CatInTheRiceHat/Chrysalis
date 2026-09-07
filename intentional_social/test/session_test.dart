import 'package:flutter_test/flutter_test.dart';
import 'package:intentional_social/domain/session.dart';

void main() {
  late Duration monotonic;
  late DateTime wall;
  late SessionEngine s;
  void advance(Duration d) {
    monotonic += d;
    wall = wall.add(d);
  }

  SessionEngine fresh() =>
      SessionEngine(monotonicNow: () => monotonic, wallNow: () => wall);
  setUp(() {
    monotonic = Duration.zero;
    wall = DateTime(2026, 9, 6);
    s = fresh();
  });

  test('foreground + running only, including repeated lifecycle events', () {
    s.start('Learn', const Duration(minutes: 15));
    advance(const Duration(seconds: 37));
    s.setForeground(false);
    s.setForeground(false);
    advance(const Duration(hours: 1));
    s.tick();
    expect(s.active, const Duration(seconds: 37));
    s.setForeground(true);
    advance(const Duration(seconds: 23));
    s.pause();
    advance(const Duration(minutes: 5));
    s.tick();
    expect(s.active, const Duration(minutes: 1));
    s.setForeground(false);
    s.resume();
    advance(const Duration(minutes: 5));
    s.tick();
    expect(s.active, const Duration(minutes: 1));
    s.setForeground(true);
    advance(const Duration(seconds: 10));
    s.tick();
    expect(s.active, const Duration(seconds: 70));
  });

  test('goal appears once; late extension grants full time; no lockout', () {
    s.start('Browse', const Duration(minutes: 1));
    advance(const Duration(minutes: 1));
    s.tick();
    expect(s.goalPending, isTrue);
    expect(s.phase, SessionPhase.running);
    s.dismissGoal();
    advance(const Duration(seconds: 30));
    s.tick();
    expect(s.goalPending, isFalse);
    s.extend(const Duration(minutes: 2));
    expect(s.remaining, const Duration(minutes: 2));
    expect(s.originalPlan, const Duration(minutes: 1));
    advance(const Duration(minutes: 2));
    s.tick();
    expect(s.goalPending, isTrue);
  });

  test('matching break includes actual extension use, excludes background and pauses', () {
    s.start('Learn', const Duration(minutes: 20));
    advance(const Duration(minutes: 20));
    s.extend(const Duration(minutes: 5));
    advance(const Duration(minutes: 5));
    s.pause();
    advance(const Duration(hours: 1));
    expect(
      s.suggestedBreak(BreakMode.matching, const Duration(minutes: 5)),
      const Duration(minutes: 25),
    );
    s.takeBreak(s.active);
    s.setForeground(false);
    advance(const Duration(minutes: 26));
    s.setForeground(true);
    expect(s.phase, SessionPhase.paused);
    expect(s.active, const Duration(minutes: 25));
    expect(s.breakFinished, isTrue);
    advance(const Duration(minutes: 2));
    s.tick();
    expect(s.active, const Duration(minutes: 25));
  });

  test('break adjustment resets remaining time; early end leaves paused', () {
    s.start('Browse', null);
    advance(const Duration(minutes: 2));
    s.takeBreak(const Duration(minutes: 5));
    advance(const Duration(minutes: 2));
    s.adjustBreak(const Duration(minutes: 10));
    expect(s.breakRemaining, const Duration(minutes: 10));
    s.endBreak();
    advance(const Duration(hours: 1));
    s.tick();
    expect(s.phase, SessionPhase.paused);
    expect(s.active, const Duration(minutes: 2));
  });

  test('running snapshot restores paused and counts no termination time', () {
    s.start('Browse', const Duration(minutes: 5));
    advance(const Duration(seconds: 19));
    s.tick();
    final saved = s.toJson();
    advance(const Duration(days: 2));
    final restored = fresh()..restore(saved);
    expect(restored.phase, SessionPhase.paused);
    expect(restored.active, const Duration(seconds: 19));
    restored.resume();
    advance(const Duration(seconds: 1));
    restored.tick();
    expect(restored.active, const Duration(seconds: 20));
  });

  test(
    'break deadline survives restart and expires without restarting use',
    () {
      s.start('Learn', null);
      advance(const Duration(minutes: 3));
      s.takeBreak(const Duration(minutes: 3));
      final saved = s.toJson();
      advance(const Duration(minutes: 1));
      final restored = fresh()..restore(saved);
      expect(restored.breakRemaining, const Duration(minutes: 2));
      advance(const Duration(minutes: 3));
      restored.tick();
      expect(restored.phase, SessionPhase.paused);
      expect(restored.active, const Duration(minutes: 3));
    },
  );

  test(
    'editing intention and target preserves original plan in reflected history',
    () {
      s.start('Browse', const Duration(minutes: 5));
      advance(const Duration(minutes: 3));
      s.edit('Learn', const Duration(minutes: 2));
      expect(s.goalPending, isTrue);
      s.end();
      s.end();
      expect(s.history.length, 1);
      s.reflect('Somewhat');
      final r = s.history.single;
      expect(r.intention, 'Learn');
      expect(r.planned, const Duration(minutes: 5));
      expect(r.target, const Duration(minutes: 2));
      expect(r.actual, const Duration(minutes: 3));
      final restored = fresh()..restore(s.toJson());
      expect(restored.history.single.reflection, 'Somewhat');
      restored.clearHistory();
      expect(restored.history, isEmpty);
    },
  );

  test(
    'unplanned sessions do not prompt; end captures last partial interval',
    () {
      s.start('Browse', null);
      advance(const Duration(hours: 1));
      s.tick();
      expect(s.goalPending, isFalse);
      expect(s.remaining, isNull);
      advance(const Duration(milliseconds: 250));
      s.end();
      s.reflect(null);
      expect(
        s.history.single.actual,
        const Duration(hours: 1, milliseconds: 250),
      );
      expect(s.history.single.reflection, isNull);
    },
  );

  test('active duration uses monotonic clock when wall clock changes', () {
    s.start('Learn', null);
    monotonic += const Duration(seconds: 15);
    wall = wall.subtract(const Duration(days: 1));
    s.tick();
    expect(s.active, const Duration(seconds: 15));
  });
}
