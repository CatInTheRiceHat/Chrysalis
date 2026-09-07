import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/app_controller.dart';
import '../domain/session.dart';
import 'theme.dart';

Future<void> openSessionControls(
  BuildContext context,
  AppController controller,
) async {
  final action = await showDialog<String>(
    context: context,
    builder: (dialogContext) => Dialog(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: SingleChildScrollView(
          child: ListenableBuilder(
            listenable: controller,
            builder: (context, _) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    tooltip: 'Close session controls',
                    onPressed: () => Navigator.pop(dialogContext),
                    icon: const Icon(Icons.close),
                  ),
                ),
                SessionPanel(
                  controller: controller,
                  onAction: (action) => Navigator.pop(dialogContext, action),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
  if (!context.mounted || !controller.session.hasSession) return;
  switch (action) {
    case 'end':
      controller.change(controller.session.end);
    case 'edit':
      await editSession(context, controller);
    case 'break':
      await chooseBreak(context, controller);
    case 'add':
      await addTime(context, controller);
  }
}

Future<Duration?> askDuration(
  BuildContext context, {
  required String title,
  String detail = 'Choose a duration in minutes.',
  int initial = 5,
}) => showDialog<Duration>(
  context: context,
  builder: (context) =>
      _DurationDialog(title: title, detail: detail, initial: initial),
);

class _DurationDialog extends StatefulWidget {
  const _DurationDialog({
    required this.title,
    required this.detail,
    required this.initial,
  });
  final String title, detail;
  final int initial;
  @override
  State<_DurationDialog> createState() => _DurationDialogState();
}

class _DurationDialogState extends State<_DurationDialog> {
  late final input = TextEditingController(text: '${widget.initial}');
  final form = GlobalKey<FormState>();
  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  void submit() {
    if (form.currentState!.validate()) {
      Navigator.pop(context, Duration(minutes: int.parse(input.text)));
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.title),
    content: SingleChildScrollView(
      child: Form(
        key: form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.detail),
            const SizedBox(height: 20),
            TextFormField(
              key: const Key('custom-minutes'),
              controller: input,
              autofocus: true,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Minutes',
                helperText: '1–1440 minutes',
              ),
              validator: (v) {
                final n = int.tryParse(v ?? '');
                return n == null || n < 1 || n > 1440
                    ? 'Enter 1 to 1440 minutes.'
                    : null;
              },
              onFieldSubmitted: (_) => submit(),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(onPressed: submit, child: const Text('Use duration')),
    ],
  );
}

class IntentionForm extends StatefulWidget {
  const IntentionForm({
    super.key,
    required this.intention,
    required this.duration,
    required this.onSubmit,
    this.onSkip,
    this.editing = false,
  });
  final String intention;
  final Duration? duration;
  final void Function(String, Duration?) onSubmit;
  final VoidCallback? onSkip;
  final bool editing;
  @override
  State<IntentionForm> createState() => _IntentionFormState();
}

class _IntentionFormState extends State<IntentionForm> {
  late String intention = widget.intention;
  late Duration? duration = widget.duration;
  static const icons = [
    Icons.people_outline,
    Icons.lightbulb_outline,
    Icons.menu_book_outlined,
    Icons.explore_outlined,
  ];
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Eyebrow('01 / Your intention'),
      const SizedBox(height: 12),
      Text(
        'What brings you here?',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 16),
      LayoutBuilder(
        builder: (context, constraints) {
          final twoColumns =
              constraints.maxWidth > 440 &&
              MediaQuery.textScalerOf(context).scale(16) < 24;
          return Wrap(
            spacing: 12,
            runSpacing: 12,
            children: List.generate(intentions.length, (i) {
              final selected = intention == intentions[i];
              return SizedBox(
                width: twoColumns
                    ? (constraints.maxWidth - 12) / 2
                    : constraints.maxWidth,
                child: Semantics(
                  selected: selected,
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      alignment: Alignment.centerLeft,
                      backgroundColor: selected
                          ? Theme.of(context).colorScheme.secondaryContainer
                          : null,
                      side: BorderSide(
                        color: selected
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.outlineVariant,
                      ),
                    ),
                    onPressed: () => setState(() => intention = intentions[i]),
                    child: Row(
                      children: [
                        Icon(icons[i], size: 22),
                        const SizedBox(width: 12),
                        Expanded(child: Text(intentions[i])),
                        if (selected) const Icon(Icons.check, size: 18),
                      ],
                    ),
                  ),
                ),
              );
            }),
          );
        },
      ),
      const SizedBox(height: 30),
      const Eyebrow('02 / Your time'),
      const SizedBox(height: 12),
      Text(
        widget.editing ? 'Your total session goal' : 'How long would you like?',
        style: Theme.of(context).textTheme.titleLarge,
      ),
      const SizedBox(height: 8),
      const Text('An intention, not a limit. You can change it anytime.'),
      const SizedBox(height: 16),
      Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final minutes in [5, 15, 30])
            ChoiceChip(
              label: Text('$minutes min'),
              selected: duration == Duration(minutes: minutes),
              onSelected: (_) =>
                  setState(() => duration = Duration(minutes: minutes)),
            ),
          ChoiceChip(
            label: Text(
              duration != null && ![5, 15, 30].contains(duration!.inMinutes)
                  ? '${duration!.inMinutes} min · custom'
                  : 'Custom',
            ),
            selected:
                duration != null && ![5, 15, 30].contains(duration!.inMinutes),
            onSelected: (_) async {
              final picked = await askDuration(
                context,
                title: 'Your intended duration',
                initial: duration?.inMinutes ?? 15,
              );
              if (picked != null && mounted) setState(() => duration = picked);
            },
          ),
          ChoiceChip(
            label: const Text('No time goal'),
            selected: duration == null,
            onSelected: (_) => setState(() => duration = null),
          ),
        ],
      ),
      const SizedBox(height: 28),
      Wrap(
        spacing: 12,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          FilledButton.icon(
            key: const Key('start-session'),
            onPressed: () => widget.onSubmit(intention, duration),
            label: Text(
              widget.editing ? 'Save session settings' : 'Begin my session',
            ),
            icon: Icon(
              widget.editing ? Icons.check : Icons.arrow_forward,
              size: 19,
            ),
          ),
          if (widget.onSkip != null)
            TextButton(
              onPressed: widget.onSkip,
              child: const Text('Skip setup'),
            ),
        ],
      ),
    ],
  );
}

Future<void> editSession(BuildContext context, AppController controller) =>
    showDialog<void>(
      context: context,
      builder: (context) => Dialog(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Make room for a change',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close settings',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                IntentionForm(
                  intention: controller.session.intention,
                  duration: controller.session.target,
                  editing: true,
                  onSubmit: (i, d) {
                    controller.change(() => controller.session.edit(i, d));
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );

Future<void> addTime(BuildContext context, AppController controller) async {
  final duration = await askDuration(
    context,
    title: 'Add some time',
    detail: 'Add minutes to your remaining time. If you have reached your goal, they start from now.',
  );
  if (duration != null && controller.session.hasSession) {
    controller.change(() => controller.session.extend(duration));
  }
}

Future<void> chooseBreak(BuildContext context, AppController controller) async {
  controller.session.tick();
  final matching = controller.breakMode == BreakMode.matching;
  final suggested = controller.session.suggestedBreak(
    controller.breakMode,
    controller.customBreak,
  );
  final result = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('A little time away'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (matching) ...[
              const Eyebrow('Experimental · You chose this rule'),
              const SizedBox(height: 12),
              const Text('Match your break to your time spent.'),
              const SizedBox(height: 12),
              Text(
                'Active time so far: ${clockText(suggested)}. Your suggestion includes any session extensions. It updates when you start the break.',
              ),
            ] else
              Text(
                'A ${suggested.inMinutes}-minute break is available. You can choose any duration.',
              ),
            const SizedBox(height: 16),
            const Text(
              'This is time away from this app. We cannot see other apps or verify that you stayed off your phone. Adjust or end your break whenever you like.',
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context, 'custom'),
          child: const Text('Custom break'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, 'suggested'),
          child: Text(matching ? 'Match active time' : 'Start break'),
        ),
      ],
    ),
  );
  if (!context.mounted || result == null || !controller.session.hasSession) {
    return;
  }
  Duration? duration;
  if (result == 'custom') {
    duration = await askDuration(
      context,
      title: 'Custom break',
      detail: 'Time away from this app. You can end it early.',
      initial: controller.customBreak.inMinutes,
    );
  } else {
    duration = controller.session.suggestedBreak(
      controller.breakMode,
      controller.customBreak,
    );
    if (duration <= Duration.zero) duration = const Duration(seconds: 1);
  }
  if (duration != null && controller.session.hasSession) {
    controller.change(() => controller.session.takeBreak(duration!));
  }
}

class SessionPanel extends StatelessWidget {
  const SessionPanel({super.key, required this.controller, this.onAction});
  final ValueChanged<String>? onAction;
  final AppController controller;
  @override
  Widget build(BuildContext context) {
    final s = controller.session;
    final paused = s.phase == SessionPhase.paused;
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Eyebrow('Your session'),
          const SizedBox(height: 16),
          Text(s.intention, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 20),
          Semantics(
            label:
                'Active time ${clockText(s.active)}. ${s.remaining == null ? 'No time goal' : '${clockText(s.remaining!)} remaining'}. ${paused ? 'Paused' : 'Running'}',
            excludeSemantics: true,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  clockText(s.active),
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                Text(
                  '${paused ? 'Paused' : 'Active time'} · ${s.remaining == null ? 'no time goal' : '${clockText(s.remaining!)} remaining'}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          if (s.target != null) ...[
            const SizedBox(height: 16),
            LinearProgressIndicator(
              value: (s.active.inMilliseconds / s.target!.inMilliseconds).clamp(
                0.0,
                1.0,
              ),
              minHeight: 4,
              borderRadius: BorderRadius.circular(4),
              semanticsLabel: 'Session time elapsed',
            ),
          ],
          const SizedBox(height: 20),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: () => controller.change(paused ? s.resume : s.pause),
                icon: Icon(
                  paused ? Icons.play_arrow_outlined : Icons.pause,
                  size: 19,
                ),
                label: Text(paused ? 'Resume' : 'Pause'),
              ),
              TextButton(
                onPressed: () => onAction != null
                    ? onAction!('end')
                    : controller.change(s.end),
                child: const Text('End session'),
              ),
            ],
          ),
          const Divider(),
          TextButton.icon(
            onPressed: () => onAction != null
                ? onAction!('edit')
                : editSession(context, controller),
            icon: const Icon(Icons.tune, size: 19),
            label: const Text('Edit intention & time'),
          ),
          TextButton.icon(
            onPressed: () => onAction != null
                ? onAction!('break')
                : chooseBreak(context, controller),
            icon: const Icon(Icons.free_breakfast_outlined, size: 19),
            label: const Text('Take a break'),
          ),
          TextButton.icon(
            onPressed: () => onAction != null
                ? onAction!('add')
                : addTime(context, controller),
            icon: const Icon(Icons.add, size: 19),
            label: const Text('Add time'),
          ),
          const SizedBox(height: 12),
          Text(
            'Only time with this app in the foreground counts. Pausing stops the timer.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
