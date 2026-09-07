import 'package:flutter_test/flutter_test.dart';
import 'package:intentional_social/data/sample_posts.dart';
import 'package:intentional_social/domain/feed.dart';

void main() {
  test(
    'default ordering is deterministic, followed + topic before discovery',
    () {
      final p = FeedPreferences();
      final ranked = rankFeed(samplePosts, p);
      expect(ranked.take(4).map((p) => p.id), ['01', '02', '03', '08']);
      expect(
        rankFeed(samplePosts.reversed.toList(), p).map((p) => p.id),
        ranked.map((p) => p.id),
      );
      expect(ranked.length, samplePosts.length);
      expect(
        explainPost(ranked.first, p),
        contains('You follow Maya Chen (+2 priority).'),
      );
      expect(
        explainPost(ranked.first, p),
        contains('You selected Nature (+1 priority).'),
      );
    },
  );
  test(
    'chronological ignores topics and follows; explanations reflect that',
    () {
      final p = FeedPreferences(
        selectedTopics: {'Science'},
        order: FeedOrder.chronological,
      );
      expect(rankFeed(samplePosts, p).take(3).map((p) => p.id), [
        '03',
        '04',
        '01',
      ]);
      expect(
        explainPost(samplePosts.first, p),
        contains('You chose chronological order'),
      );
      expect(explainPost(samplePosts.first, p), isNot(contains('+2')));
    },
  );
  test('changing selected topics changes priority without filtering posts', () {
    final p = FeedPreferences(selectedTopics: {'Food'});
    expect(rankFeed(samplePosts, p).first.id, '08');
    expect(rankFeed(samplePosts, p).length, 12);
    expect(explainPost(samplePosts[3], p), contains('discovery post'));
    expect(FeedPreferences.fromJson(p.toJson()).selectedTopics, {'Food'});
  });
}
