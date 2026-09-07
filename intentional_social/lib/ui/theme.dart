import 'package:flutter/material.dart';

ThemeData appTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF7C6D8C),
    brightness: brightness,
    primary: dark ? const Color(0xFFC9B8D8) : const Color(0xFF7C6D8C),
    onPrimary: dark ? const Color(0xFF221C30) : const Color(0xFFFFFFFF),
    surface: dark ? const Color(0xFF221C30) : const Color(0xFFFFFFFF),
    onSurface: dark ? const Color(0xFFEFEAF3) : const Color(0xFF2B2631),
    onSurfaceVariant: dark ? const Color(0xFFA79FB2) : const Color(0xFF736C7D),
    outlineVariant: dark ? const Color(0xFF41384E) : const Color(0xFFDEDCE0),
    secondaryContainer: dark
        ? const Color(0xFF1F1A2B)
        : const Color(0xFFF2EEF5),
  );
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    fontFamily: 'Montserrat',
  );
  return base.copyWith(
    visualDensity: VisualDensity.standard,
    scaffoldBackgroundColor: dark
        ? const Color(0xFF161320)
        : const Color(0xFFFAF9F6),
    textTheme: base.textTheme.copyWith(
      displaySmall: TextStyle(
        fontFamily: 'Abril Fatface',
        fontSize: 44,
        height: 1.13,
        color: scheme.onSurface,
      ),
      headlineLarge: TextStyle(
        fontFamily: 'Abril Fatface',
        fontSize: 34,
        height: 1.2,
        color: scheme.onSurface,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'Abril Fatface',
        fontSize: 28,
        height: 1.25,
        color: scheme.onSurface,
      ),
      titleLarge: TextStyle(
        fontFamily: 'Montserrat',
        fontSize: 20,
        fontWeight: FontWeight.w600,
        height: 1.3,
        color: scheme.onSurface,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'Montserrat',
        fontSize: 16,
        height: 1.65,
        color: scheme.onSurface,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'Montserrat',
        fontSize: 16,
        height: 1.5,
        color: scheme.onSurface,
      ),
      bodySmall: TextStyle(
        fontFamily: 'Montserrat',
        fontSize: 13,
        height: 1.5,
        color: scheme.onSurfaceVariant,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      color: scheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(28),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 52),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(
          fontFamily: 'Montserrat',
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(48, 48),
        textStyle: const TextStyle(
          fontFamily: 'Montserrat',
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
    ),
    chipTheme: base.chipTheme.copyWith(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      side: BorderSide(color: scheme.outlineVariant),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
      contentPadding: const EdgeInsets.all(16),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant, space: 32),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: scheme.surface,
      elevation: 0,
    ),
  );
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: Theme.of(context).textTheme.bodySmall
        ?.copyWith(letterSpacing: 2, fontWeight: FontWeight.w700),
  );
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.padding = 24});
  final Widget child;
  final double padding;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(padding: EdgeInsets.all(padding), child: child),
  );
}

class PageHeading extends StatelessWidget {
  const PageHeading(this.eyebrow, this.title, this.subtitle, {super.key});
  final String eyebrow, title, subtitle;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Eyebrow(eyebrow),
      const SizedBox(height: 12),
      Semantics(
        header: true,
        child: Text(title, style: Theme.of(context).textTheme.headlineLarge),
      ),
      const SizedBox(height: 12),
      Text(subtitle, style: Theme.of(context).textTheme.bodyLarge),
      const SizedBox(height: 28),
    ],
  );
}
