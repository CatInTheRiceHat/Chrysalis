import 'package:flutter/material.dart';

import '../domain/feed.dart';
import 'artwork.dart';

/// Layout port of ReelCard/ReelCaption/ReelActionRail from the existing site.
/// Local illustrated posts replace network video; this never simulates playback.
class PostCard extends StatefulWidget {
  const PostCard({
    super.key,
    required this.post,
    required this.preferences,
    required this.position,
  });
  final Post post;
  final FeedPreferences preferences;
  final int position;
  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  bool liked = false;
  void why() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Why am I seeing this?'),
      content: SingleChildScrollView(
        child: Text(explainPost(widget.post, widget.preferences)),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Got it'),
        ),
      ],
    ),
  );
  void read() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(widget.post.title),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${widget.post.name} · ${widget.post.handle}'),
            const SizedBox(height: 16),
            Text(widget.post.body),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final desktop = constraints.maxWidth >= 900;
      final frameHeight =
          (MediaQuery.sizeOf(context).height - (desktop ? 280 : 330)).clamp(
            460.0,
            760.0,
          );
      final frameWidth = desktop
          ? (constraints.maxWidth * .45).clamp(360.0, 440.0)
          : constraints.maxWidth.clamp(0.0, 440.0);
      final p = widget.post;
      final scheme = Theme.of(context).colorScheme;
      final media = Container(
        width: frameWidth,
        height: frameHeight,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: scheme.outlineVariant),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(
                alpha: Theme.of(context).brightness == Brightness.dark
                    ? .30
                    : .14,
              ),
              offset: const Offset(0, 24),
              blurRadius: 60,
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            fit: StackFit.expand,
            children: [
              RepaintBoundary(child: PostArtwork(p.art, height: frameHeight)),
              Positioned(
                top: 16,
                left: 16,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: scheme.surface.withValues(alpha: .93),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    child: Text(
                      'Sample post · ${widget.position.toString().padLeft(2, '0')}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                ),
              ),
              if (!desktop) ...[
                const Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 350,
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Color(0xEF100E15)],
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 20,
                  right: 70,
                  bottom: 20,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        p.title,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(
                              color: Colors.white,
                              fontSize: 25,
                              height: 1.08,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        p.handle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      TextButton(
                        onPressed: read,
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.zero,
                          alignment: Alignment.centerLeft,
                        ),
                        child: const Text('Read post'),
                      ),
                    ],
                  ),
                ),
                Positioned(top: 72, right: 12, child: _rail(overlay: true)),
              ],
            ],
          ),
        ),
      );
      final caption = SizedBox(
        width: 280,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: scheme.secondaryContainer,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: scheme.outlineVariant),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                child: Text(
                  p.topic,
                  style: const TextStyle(
                    fontFamily: 'Story Script',
                    fontSize: 22,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              p.title,
              style: Theme.of(context).textTheme.headlineLarge
                  ?.copyWith(height: 1.03),
            ),
            const SizedBox(height: 16),
            Text(
              p.handle,
              style: TextStyle(
                color: scheme.primary,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              p.body,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(height: 1.6),
            ),
            const Divider(),
            Text(
              p.followed ? 'Following ${p.name}' : 'Discover · ${p.topic}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      );
      return Padding(
        padding: const EdgeInsets.only(top: 18, bottom: 50),
        child: Align(
          alignment: desktop ? Alignment.centerLeft : Alignment.center,
          child: desktop
              ? Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    caption,
                    const SizedBox(width: 48),
                    media,
                    const SizedBox(width: 24),
                    _rail(),
                  ],
                )
              : media,
        ),
      );
    },
  );

  Widget _rail({bool overlay = false}) => SizedBox(
    width: 60,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _action(
          liked ? Icons.favorite : Icons.favorite_border,
          'Like',
          liked
              ? 'Remove appreciation (this visit only)'
              : 'Appreciate (this visit only)',
          () => setState(() => liked = !liked),
          overlay,
          selected: liked,
        ),
        const SizedBox(height: 16),
        _action(Icons.notes_outlined, 'Read', 'Read full post', read, overlay),
        const SizedBox(height: 16),
        _action(
          Icons.help_outline,
          'Why?',
          'Why am I seeing this?',
          why,
          overlay,
        ),
      ],
    ),
  );

  Widget _action(
    IconData icon,
    String label,
    String tooltip,
    VoidCallback callback,
    bool overlay, {
    bool selected = false,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Semantics(
          toggled: label == 'Like' ? selected : null,
          child: IconButton(
            tooltip: tooltip,
            onPressed: callback,
            icon: Icon(icon, size: 22),
            style: IconButton.styleFrom(
              backgroundColor: selected
                  ? scheme.primary
                  : scheme.surface.withValues(alpha: .94),
              foregroundColor: selected ? scheme.onPrimary : scheme.onSurface,
              side: BorderSide(color: scheme.outlineVariant),
              shape: const CircleBorder(),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: overlay ? Colors.white : scheme.onSurfaceVariant,
            shadows: overlay
                ? const [Shadow(color: Colors.black, blurRadius: 6)]
                : null,
          ),
        ),
      ],
    );
  }
}
