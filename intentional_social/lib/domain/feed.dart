enum FeedOrder { recommended, chronological }

const topics = ['Nature', 'Design', 'Everyday life', 'Science', 'Food'];

class FeedPreferences {
  FeedPreferences({
    Set<String>? selectedTopics,
    this.order = FeedOrder.recommended,
  }) : selectedTopics = Set.unmodifiable(
         selectedTopics ?? {'Nature', 'Design'},
       );
  final Set<String> selectedTopics;
  final FeedOrder order;
  Map<String, dynamic> toJson() => {
    'topics': selectedTopics.toList()..sort(),
    'order': order.name,
  };
  factory FeedPreferences.fromJson(Map<String, dynamic> json) =>
      FeedPreferences(
        selectedTopics: (json['topics'] as List)
            .cast<String>()
            .where(topics.contains)
            .toSet(),
        order: FeedOrder.values.byName(json['order'] as String),
      );
}

class Post {
  const Post(
    this.id,
    this.name,
    this.handle,
    this.topic,
    this.followed,
    this.recency,
    this.title,
    this.body,
    this.art,
  );
  final String id, name, handle, topic, title, body, art;
  final bool followed;
  // Larger values are newer in this fixed, bundled sample edition.
  final int recency;
  String get initials => name.split(' ').map((s) => s[0]).take(2).join();
}

int priority(Post post, FeedPreferences preferences) =>
    (post.followed ? 2 : 0) +
    (preferences.selectedTopics.contains(post.topic) ? 1 : 0);

List<Post> rankFeed(List<Post> posts, FeedPreferences preferences) {
  final result = List<Post>.of(posts);
  result.sort((a, b) {
    if (preferences.order == FeedOrder.recommended) {
      final difference = priority(
        b,
        preferences,
      ).compareTo(priority(a, preferences));
      if (difference != 0) return difference;
    }
    final recent = b.recency.compareTo(a.recency);
    return recent != 0 ? recent : a.id.compareTo(b.id);
  });
  return result;
}

String explainPost(Post post, FeedPreferences preferences) {
  if (preferences.order == FeedOrder.chronological) {
    return 'You chose chronological order. This sample post is placed by its publication order, newest first. Topics and follows do not change this order.';
  }
  final reasons = <String>[
    if (post.followed) 'You follow ${post.name} (+2 priority).',
    if (preferences.selectedTopics.contains(post.topic))
      'You selected ${post.topic} (+1 priority).',
  ];
  if (reasons.isEmpty) {
    reasons.add(
      'This is a discovery post from the bundled sample collection (+0 priority).',
    );
  }
  return '${reasons.join(' ')} Higher priority appears first; ties use newest first. No AI, watch-time ranking, or hidden personalization.';
}
