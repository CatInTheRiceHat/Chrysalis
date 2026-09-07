import 'dart:async';

import 'package:flutter/material.dart';

import '../data/app_store.dart';
import 'feed.dart';
import 'session.dart';

class AppController extends ChangeNotifier {
  AppController({required this.store, required this.session});
  final AppStore store;
  final SessionEngine session;
  FeedPreferences preferences = FeedPreferences();
  FeedPreferences? _undoPreferences;
  BreakMode breakMode = BreakMode.off;
  Duration customBreak = const Duration(minutes: 5);
  ThemeMode themeMode = ThemeMode.system;
  String defaultIntention = 'Find inspiration';
  Duration? defaultDuration = const Duration(minutes: 15);
  String? storageError;
  bool restoredSession = false;
  bool _disposed = false;
  Future<void> _writes = Future.value();
  Timer? _timer;
  bool get canUndoPreferences => _undoPreferences != null;

  Future<void> load() async {
    try {
      final j = await store.read();
      if (j == null) return;
      if (j['version'] != 1) {
        throw const FormatException('Unsupported saved version');
      }
      final loadedPreferences = FeedPreferences.fromJson(
        Map<String, dynamic>.from(j['preferences']),
      );
      final loadedBreakMode = BreakMode.values.byName(j['breakMode'] as String);
      final loadedTheme = ThemeMode.values.byName(j['themeMode'] as String);
      final loadedCustomBreak = Duration(milliseconds: j['customBreak'] as int);
      final loadedIntention = j['defaultIntention'] as String;
      final loadedDuration = j['defaultDuration'] == null
          ? null
          : Duration(milliseconds: j['defaultDuration'] as int);
      final validatedSession = SessionEngine(
        monotonicNow: session.monotonicNow,
        wallNow: session.wallNow,
      )..restore(Map<String, dynamic>.from(j['session']));
      session.restore(validatedSession.toJson());
      preferences = loadedPreferences;
      breakMode = loadedBreakMode;
      themeMode = loadedTheme;
      customBreak = loadedCustomBreak;
      defaultIntention = loadedIntention;
      defaultDuration = loadedDuration;
      restoredSession = session.hasSession;
    } catch (_) {
      storageError = 'Saved data could not be read. You can keep using this prototype; new changes will be saved on this device when storage is available.';
    }
  }

  void startTicker() {
    _timer ??= Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  void tick() {
    session.tick();
    // Checkpoint each active second; no writes while idle.
    if (session.hasSession) unawaited(save());
    _notify();
  }

  void change(VoidCallback action) {
    action();
    unawaited(save());
    _notify();
  }

  void foreground(bool value) {
    session.setForeground(value);
    unawaited(save());
    _notify();
  }

  void applyPreferences(FeedPreferences value) {
    _undoPreferences = preferences;
    change(() => preferences = value);
  }

  void undoPreferences() {
    final previous = _undoPreferences;
    if (previous == null) return;
    change(() {
      preferences = previous;
      _undoPreferences = null;
    });
  }

  Map<String, dynamic> snapshot() => {
    'version': 1,
    'preferences': preferences.toJson(),
    'breakMode': breakMode.name,
    'customBreak': customBreak.inMilliseconds,
    'themeMode': themeMode.name,
    'defaultIntention': defaultIntention,
    'defaultDuration': defaultDuration?.inMilliseconds,
    'session': session.toJson(),
  };

  Future<void> save() {
    final value = snapshot();
    // Serialize all writes so an older timer checkpoint cannot resurrect cleared history.
    _writes = _writes.then((_) async {
      try {
        await store.write(value);
        if (storageError != null) {
          storageError = null;
          _notify();
        }
      } catch (_) {
        storageError = 'Changes are available for this visit, but could not be saved on this device. Check available storage or browser settings.';
        _notify();
      }
    });
    return _writes;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _timer?.cancel();
    super.dispose();
  }
}
