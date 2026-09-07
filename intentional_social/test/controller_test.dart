import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intentional_social/data/app_store.dart';
import 'package:intentional_social/domain/app_controller.dart';
import 'package:intentional_social/domain/feed.dart';
import 'package:intentional_social/domain/session.dart';

class RecordingStore implements AppStore {
  Map<String, dynamic>? data;
  bool fail = false;
  @override
  Future<Map<String, dynamic>?> read() async => data;
  @override
  Future<void> write(Map<String, dynamic> value) async {
    await Future<void>.delayed(const Duration(milliseconds: 1));
    if (fail) throw StateError('Storage unavailable');
    data = jsonDecode(jsonEncode(value)) as Map<String, dynamic>;
  }
}

void main() {
  AppController make(RecordingStore store) => AppController(
    store: store,
    session: SessionEngine(
      monotonicNow: () => Duration.zero,
      wallNow: () => DateTime(2026),
    ),
  );

  test(
    'settings, reflection, and history persist across controllers',
    () async {
      final store = RecordingStore();
      final c = make(store);
      c.applyPreferences(
        FeedPreferences(
          selectedTopics: {'Science'},
          order: FeedOrder.chronological,
        ),
      );
      c.change(() {
        c.breakMode = BreakMode.matching;
        c.themeMode = ThemeMode.dark;
        c.session.start('Learn', const Duration(minutes: 20));
        c.session.end();
        c.session.reflect('Yes');
      });
      await c.save();
      final restored = make(store);
      await restored.load();
      expect(restored.preferences.order, FeedOrder.chronological);
      expect(restored.preferences.selectedTopics, {'Science'});
      expect(restored.breakMode, BreakMode.matching);
      expect(restored.themeMode, ThemeMode.dark);
      expect(restored.session.history.single.reflection, 'Yes');
      c.dispose();
      restored.dispose();
    },
  );

  test('queued checkpoints cannot restore history after clear', () async {
    final store = RecordingStore();
    final c = make(store);
    c.change(() {
      c.session.start('Browse', null);
      c.session.end();
      c.session.reflect(null);
    });
    c.change(c.session.clearHistory);
    await c.save();
    final restored = make(store);
    await restored.load();
    expect(restored.session.history, isEmpty);
    c.dispose();
    restored.dispose();
  });

  test('failed storage is visible and later save recovers', () async {
    final store = RecordingStore()..fail = true;
    final c = make(store);
    await c.save();
    expect(c.storageError, isNotNull);
    store.fail = false;
    await c.save();
    expect(c.storageError, isNull);
    c.dispose();
  });

  test('undo restores exact previous preferences', () async {
    final c = make(RecordingStore());
    final original = c.preferences;
    c.applyPreferences(
      FeedPreferences(selectedTopics: {}, order: FeedOrder.chronological),
    );
    c.undoPreferences();
    await c.save();
    expect(c.preferences, same(original));
    expect(c.canUndoPreferences, isFalse);
    c.dispose();
  });
}
