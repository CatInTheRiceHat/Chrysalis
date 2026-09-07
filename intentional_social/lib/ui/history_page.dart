import 'package:flutter/material.dart';

import '../domain/app_controller.dart';
import '../domain/session.dart';
import 'theme.dart';

class HistoryPage extends StatelessWidget {
  const HistoryPage({super.key, required this.controller});
  final AppController controller;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const PageHeading(
        'Only for you',
        'Your time, in perspective.',
        'A record of your intentions and choices. No scores, streaks, or judgments.',
      ),
      SectionCard(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.lock_outline),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Private to this device',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'History is saved locally. Anyone with access to this device or browser profile may be able to see it. It is not sent to a server.',
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: controller.session.history.isEmpty
                        ? null
                        : () async {
                            final clear = await showDialog<bool>(
                              context: context,
                              builder: (context) => AlertDialog(
                                title: const Text('Clear session history?'),
                                content: const Text(
                                  'This removes all saved sessions and reflections from this device. Your preferences and current active session stay in place.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, false),
                                    child: const Text('Keep history'),
                                  ),
                                  FilledButton(
                                    onPressed: () =>
                                        Navigator.pop(context, true),
                                    child: const Text('Clear history'),
                                  ),
                                ],
                              ),
                            );
                            if (clear == true) {
                              controller.change(
                                controller.session.clearHistory,
                              );
                              await controller.save();
                            }
                          },
                    icon: const Icon(Icons.delete_outline, size: 19),
                    label: const Text('Clear history'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 28),
      if (controller.session.history.isEmpty)
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.history, size: 32),
              const SizedBox(height: 20),
              Text(
                'A fresh page.',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 12),
              const Text(
                'Your finished sessions will appear here, whether or not you choose to reflect.',
              ),
            ],
          ),
        ),
      for (final record in controller.session.history)
        Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Eyebrow(_date(record.startedAt)),
                const SizedBox(height: 12),
                Text(
                  record.intention,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 18),
                Wrap(
                  spacing: 32,
                  runSpacing: 16,
                  children: [
                    _Metric(
                      'Originally planned',
                      record.planned == null
                          ? 'Not set'
                          : clockText(record.planned!),
                    ),
                    _Metric(
                      'Final time goal',
                      record.target == null
                          ? 'Not set'
                          : clockText(record.target!),
                    ),
                    _Metric('Actual active time', clockText(record.actual)),
                  ],
                ),
                const Divider(),
                Text(
                  'Did this session match what you wanted?',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 6),
                Text(
                  record.reflection ?? 'Reflection skipped',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
    ],
  );
  String _date(DateTime date) {
    final d = date.toLocal();
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return '${months[d.month - 1]} ${d.day}, ${d.year} · ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label, value;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 4),
      Text(value, style: Theme.of(context).textTheme.titleLarge),
    ],
  );
}
