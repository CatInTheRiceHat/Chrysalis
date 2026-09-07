import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Original, offline artwork, rendered at the device's resolution.
class PostArtwork extends StatelessWidget {
  const PostArtwork(this.kind, {super.key, this.height = 250});
  final String kind;
  final double height;
  @override
  Widget build(BuildContext context) => Semantics(
    image: true,
    label: switch (kind) {
      'butterfly' => 'An origami butterfly with faceted lavender wings, inspired by the Chrysalis identity',
      'landscape' => 'Illustration of hills, a winding river, and a pale sun',
      'shapes' => 'An abstract geometric print on an artist’s study',
      'leaf' => 'Botanical illustration of a leafy branch on cream paper',
      _ => 'Illustration of a cup and fruit on a sunlit table',
    },
    child: SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(painter: _ArtPainter(kind)),
    ),
  );
}

class _ArtPainter extends CustomPainter {
  const _ArtPainter(this.kind);
  final String kind;
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    final scale = math.max(size.width / 600, size.height / 320);
    canvas.translate(
      (size.width - 600 * scale) / 2,
      (size.height - 320 * scale) / 2,
    );
    canvas.scale(scale);
    void rect(Rect r, int c) => canvas.drawRect(r, Paint()..color = Color(c));
    void circle(Offset p, double r, int c) =>
        canvas.drawCircle(p, r, Paint()..color = Color(c));
    rect(const Rect.fromLTWH(0, 0, 600, 320), 0xFFE8E5D3);
    if (kind == 'landscape') {
      rect(const Rect.fromLTWH(0, 0, 600, 320), 0xFFDCE1D1);
      circle(const Offset(440, 75), 38, 0xFFF9F0CC);
      final hill = Path()
        ..moveTo(-20, 185)
        ..cubicTo(80, 70, 165, 150, 280, 140)
        ..cubicTo(410, 90, 480, 130, 630, 80)
        ..lineTo(630, 340)
        ..lineTo(-20, 340)
        ..close();
      canvas.drawPath(hill, Paint()..color = const Color(0xFF9DAE8C));
      final hill2 = Path()
        ..moveTo(-20, 190)
        ..cubicTo(90, 240, 180, 160, 300, 200)
        ..cubicTo(440, 270, 470, 110, 630, 175)
        ..lineTo(630, 340)
        ..lineTo(-20, 340)
        ..close();
      canvas.drawPath(hill2, Paint()..color = const Color(0xFF637E61));
      final river = Path()
        ..moveTo(370, 165)
        ..cubicTo(245, 205, 455, 221, 290, 258)
        ..cubicTo(200, 278, 213, 300, 205, 330)
        ..lineTo(340, 330)
        ..cubicTo(260, 276, 465, 246, 383, 222)
        ..cubicTo(302, 203, 346, 183, 370, 165);
      canvas.drawPath(river, Paint()..color = const Color(0xFFD8E2D7));
      final front = Path()
        ..moveTo(-20, 252)
        ..quadraticBezierTo(120, 188, 221, 330)
        ..lineTo(-20, 330)
        ..close();
      canvas.drawPath(front, Paint()..color = const Color(0xFF3E5947));
      for (var i = 0; i < 16; i++) {
        final x = 15.0 + i * 11;
        canvas.drawLine(
          Offset(x, 320),
          Offset(x + 8, 282 + math.sin(i) * 16),
          Paint()
            ..color = const Color(0xFF819879)
            ..strokeWidth = 2,
        );
      }
    } else if (kind == 'shapes') {
      rect(const Rect.fromLTWH(0, 0, 600, 320), 0xFFE9E4DA);
      canvas.drawRRect(
        RRect.fromRectAndCorners(
          const Rect.fromLTWH(230, 28, 100, 264),
          topLeft: const Radius.circular(70),
          topRight: const Radius.circular(70),
        ),
        Paint()..color = const Color(0xFFAF7962),
      );
      circle(const Offset(340, 113), 42, 0xFF40525A);
      rect(const Rect.fromLTWH(297, 211, 80, 15), 0xFF42535A);
      rect(const Rect.fromLTWH(297, 239, 80, 8), 0xFF42535A);
      circle(const Offset(280, 194), 27, 0xFFE9E4DA);
    } else if (kind == 'leaf') {
      canvas.drawLine(
        const Offset(220, 325),
        const Offset(368, 20),
        Paint()
          ..color = const Color(0xFF50694E)
          ..strokeWidth = 5,
      );
      for (var i = 0; i < 6; i++) {
        final y = 65.0 + i * 39;
        final x = 346 - i * 19.0;
        canvas.save();
        canvas.translate(x, y);
        canvas.rotate(i.isEven ? -.6 : .8);
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(i.isEven ? 38 : -38, 0),
            width: 100,
            height: 34,
          ),
          Paint()..color = Color(i.isEven ? 0xFF78916B : 0xFF4E7056),
        );
        canvas.restore();
      }
    } else {
      rect(const Rect.fromLTWH(0, 0, 600, 220), 0xFFEEE0DB);
      rect(const Rect.fromLTWH(0, 220, 600, 100), 0xFFCCB4BF);
      canvas.drawOval(
        const Rect.fromLTWH(100, 223, 390, 49),
        Paint()..color = const Color(0xFFB29BAC),
      );
      canvas.drawOval(
        const Rect.fromLTWH(135, 185, 185, 69),
        Paint()..color = const Color(0xFFFFF9F1),
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          const Rect.fromLTWH(175, 112, 105, 118),
          const Radius.circular(24),
        ),
        Paint()..color = const Color(0xFF607B67),
      );
      canvas.drawOval(
        const Rect.fromLTWH(175, 105, 105, 32),
        Paint()..color = const Color(0xFF395443),
      );
      canvas.drawArc(
        const Rect.fromLTWH(240, 131, 75, 65),
        -math.pi / 2,
        math.pi,
        false,
        Paint()
          ..color = const Color(0xFF607B67)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 13,
      );
      circle(const Offset(386, 216), 38, 0xFFD2A28F);
      circle(const Offset(432, 222), 29, 0xFFC28D9F);
    }
    final random = math.Random(12);
    final grain = Paint()..color = const Color(0x0E493653);
    for (var i = 0; i < 1700; i++) {
      canvas.drawCircle(
        Offset(random.nextDouble() * 600, random.nextDouble() * 320),
        .6,
        grain,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _ArtPainter oldDelegate) =>
      oldDelegate.kind != kind;
}
