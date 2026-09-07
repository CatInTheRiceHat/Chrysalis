import 'package:flutter/material.dart';

/// Uses the exact mark displayed by the existing React feed's AppSidebar.
class ButterflyMark extends StatelessWidget {
  const ButterflyMark({super.key, this.size = 32});
  final double size;
  @override
  Widget build(BuildContext context) => Image.asset(
    'assets/brand/logo.png',
    width: size,
    height: size,
    fit: BoxFit.contain,
    excludeFromSemantics: true,
  );
}
