import 'package:flutter/material.dart';

import 'data/app_store.dart';
import 'domain/app_controller.dart';
import 'domain/session.dart';
import 'ui/shell.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final clock = Stopwatch()..start();
  final controller = AppController(
    store: LocalAppStore(),
    session: SessionEngine(
      monotonicNow: () => clock.elapsed,
      wallNow: DateTime.now,
    ),
  );
  await controller.load();
  runApp(ChrysalisApp(controller: controller));
}

class ChrysalisApp extends StatefulWidget {
  const ChrysalisApp({
    super.key,
    required this.controller,
    this.enableTicker = true,
  });
  final AppController controller;
  final bool enableTicker;
  @override
  State<ChrysalisApp> createState() => _ChrysalisAppState();
}

class _ChrysalisAppState extends State<ChrysalisApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final lifecycle = WidgetsBinding.instance.lifecycleState;
    widget.controller.foreground(
      lifecycle == null || lifecycle == AppLifecycleState.resumed,
    );
    if (widget.enableTicker) widget.controller.startTicker();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      widget.controller.foreground(state == AppLifecycleState.resumed);
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.controller,
    builder: (context, _) => MaterialApp(
      title: 'Chrysalis · Your time, your choice',
      debugShowCheckedModeBanner: false,
      theme: appTheme(Brightness.light),
      darkTheme: appTheme(Brightness.dark),
      themeMode: widget.controller.themeMode,
      themeAnimationDuration: Duration.zero,
      home: AppShell(controller: widget.controller),
    ),
  );
}
