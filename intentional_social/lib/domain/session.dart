enum SessionPhase { idle, running, paused, onBreak, reflecting }

enum BreakMode { off, matching, custom }

const intentions = [
  'Catch up with friends',
  'Find inspiration',
  'Learn',
  'Browse',
];

String clockText(Duration duration) {
  final seconds = duration.inSeconds.clamp(0, 359999);
  final m = seconds ~/ 60;
  return '$m:${(seconds % 60).toString().padLeft(2, '0')}';
}

class SessionRecord {
  SessionRecord({
    required this.id,
    required this.startedAt,
    required this.intention,
    required this.planned,
    required this.target,
    required this.actual,
    this.reflection,
  });
  final String id, intention;
  final DateTime startedAt;
  final Duration? planned, target;
  final Duration actual;
  String? reflection;
  Map<String, dynamic> toJson() => {
    'id': id,
    'startedAt': startedAt.toIso8601String(),
    'intention': intention,
    'planned': planned?.inMilliseconds,
    'target': target?.inMilliseconds,
    'actual': actual.inMilliseconds,
    'reflection': reflection,
  };
  factory SessionRecord.fromJson(Map<String, dynamic> j) => SessionRecord(
    id: j['id'] as String,
    startedAt: DateTime.parse(j['startedAt'] as String),
    intention: j['intention'] as String,
    planned: j['planned'] == null
        ? null
        : Duration(milliseconds: j['planned'] as int),
    target: j['target'] == null
        ? null
        : Duration(milliseconds: j['target'] as int),
    actual: Duration(milliseconds: j['actual'] as int),
    reflection: j['reflection'] as String?,
  );
}

/// Monotonic foreground accounting; wall-clock deadlines only for breaks.
/// The host calls tick periodically and setForeground for every lifecycle change.
class SessionEngine {
  SessionEngine({required this.monotonicNow, required this.wallNow});
  final Duration Function() monotonicNow;
  final DateTime Function() wallNow;
  SessionPhase phase = SessionPhase.idle;
  bool foreground = true;
  Duration? _anchor;
  Duration active = Duration.zero;
  Duration? originalPlan, target;
  String intention = 'Browse';
  DateTime? startedAt, breakDeadline;
  bool goalAcknowledged = false;
  bool goalPending = false;
  bool breakFinished = false;
  final List<SessionRecord> history = [];
  String? pendingReflectionId;
  bool get hasSession =>
      phase != SessionPhase.idle && phase != SessionPhase.reflecting;
  Duration? get remaining => target == null
      ? null
      : (target! - active < Duration.zero ? Duration.zero : target! - active);
  Duration get breakRemaining {
    if (breakDeadline == null) return Duration.zero;
    final d = breakDeadline!.difference(wallNow());
    return d.isNegative ? Duration.zero : d;
  }

  void start(String choice, Duration? plan) {
    if (hasSession || phase == SessionPhase.reflecting) return;
    if (plan != null && plan <= Duration.zero) {
      throw ArgumentError('Plan must be positive');
    }
    intention = choice;
    originalPlan = target = plan;
    active = Duration.zero;
    startedAt = wallNow();
    goalAcknowledged = goalPending = breakFinished = false;
    breakDeadline = null;
    phase = SessionPhase.running;
    _anchor = foreground ? monotonicNow() : null;
  }

  void tick() {
    final now = monotonicNow();
    if (phase == SessionPhase.running && foreground && _anchor != null) {
      final delta = now - _anchor!;
      if (!delta.isNegative) active += delta;
    }
    _anchor = phase == SessionPhase.running && foreground ? now : null;
    if (hasSession &&
        target != null &&
        active >= target! &&
        !goalAcknowledged) {
      goalPending = true;
      goalAcknowledged = true;
    }
    if (phase == SessionPhase.onBreak && breakRemaining == Duration.zero) {
      phase = SessionPhase.paused;
      breakDeadline = null;
      breakFinished = true;
    }
  }

  void setForeground(bool value) {
    tick();
    foreground = value;
    _anchor = phase == SessionPhase.running && foreground
        ? monotonicNow()
        : null;
  }

  void pause() {
    tick();
    if (phase == SessionPhase.running) phase = SessionPhase.paused;
    _anchor = null;
  }

  void resume() {
    if (phase != SessionPhase.paused) return;
    phase = SessionPhase.running;
    breakFinished = false;
    _anchor = foreground ? monotonicNow() : null;
  }

  void dismissGoal() => goalPending = false;

  void extend(Duration amount) {
    if (!hasSession || amount <= Duration.zero) {
      throw ArgumentError('Extension must be positive');
    }
    tick();
    // Always grant the full extension, including when the decision came later.
    target = (target != null && target! > active ? target! : active) + amount;
    goalPending = goalAcknowledged = false;
  }

  void edit(String choice, Duration? plan) {
    if (!hasSession) return;
    if (plan != null && plan <= Duration.zero) {
      throw ArgumentError('Plan must be positive');
    }
    tick();
    intention = choice;
    target = plan;
    goalPending = false;
    goalAcknowledged = false;
    tick();
  }

  Duration suggestedBreak(BreakMode mode, Duration custom) {
    tick();
    return mode == BreakMode.matching ? active : custom;
  }

  void takeBreak(Duration duration) {
    if (!hasSession || duration <= Duration.zero) {
      throw ArgumentError('Break must be positive');
    }
    tick();
    phase = SessionPhase.onBreak;
    _anchor = null;
    breakDeadline = wallNow().add(duration);
    goalPending = false;
    breakFinished = false;
  }

  void adjustBreak(Duration remaining) {
    if (phase != SessionPhase.onBreak || remaining <= Duration.zero) return;
    breakDeadline = wallNow().add(remaining);
  }

  void endBreak() {
    if (phase != SessionPhase.onBreak) return;
    phase = SessionPhase.paused;
    breakDeadline = null;
    breakFinished = true;
  }

  void end() {
    if (!hasSession) return;
    tick();
    final id = startedAt!.microsecondsSinceEpoch.toString();
    history.insert(
      0,
      SessionRecord(
        id: id,
        startedAt: startedAt!,
        intention: intention,
        planned: originalPlan,
        target: target,
        actual: active,
      ),
    );
    pendingReflectionId = id;
    phase = SessionPhase.reflecting;
    breakDeadline = null;
    goalPending = false;
    _anchor = null;
  }

  void reflect(String? answer) {
    for (final record in history) {
      if (record.id == pendingReflectionId) record.reflection = answer;
    }
    pendingReflectionId = null;
    phase = SessionPhase.idle;
  }

  void clearHistory() {
    history.clear();
    pendingReflectionId = null;
    if (phase == SessionPhase.reflecting) phase = SessionPhase.idle;
  }

  Map<String, dynamic> toJson() => {
    'phase': phase.name,
    'active': active.inMilliseconds,
    'originalPlan': originalPlan?.inMilliseconds,
    'target': target?.inMilliseconds,
    'intention': intention,
    'startedAt': startedAt?.toIso8601String(),
    'breakDeadline': breakDeadline?.toIso8601String(),
    'goalAcknowledged': goalAcknowledged,
    'goalPending': goalPending,
    'breakFinished': breakFinished,
    'pendingReflectionId': pendingReflectionId,
    'history': history.map((r) => r.toJson()).toList(),
  };

  void restore(Map<String, dynamic> j) {
    final savedPhase = SessionPhase.values.byName(j['phase'] as String);
    // Never count time during termination or automatically restart active use.
    phase = savedPhase == SessionPhase.running
        ? SessionPhase.paused
        : savedPhase;
    active = Duration(milliseconds: j['active'] as int);
    originalPlan = j['originalPlan'] == null
        ? null
        : Duration(milliseconds: j['originalPlan'] as int);
    target = j['target'] == null
        ? null
        : Duration(milliseconds: j['target'] as int);
    intention = j['intention'] as String;
    startedAt = j['startedAt'] == null
        ? null
        : DateTime.parse(j['startedAt'] as String);
    breakDeadline = j['breakDeadline'] == null
        ? null
        : DateTime.parse(j['breakDeadline'] as String);
    goalAcknowledged = j['goalAcknowledged'] as bool;
    goalPending = j['goalPending'] as bool;
    breakFinished = j['breakFinished'] as bool;
    pendingReflectionId = j['pendingReflectionId'] as String?;
    history.clear();
    history.addAll(
      (j['history'] as List).map(
        (r) => SessionRecord.fromJson(Map<String, dynamic>.from(r as Map)),
      ),
    );
    _anchor = null;
    tick();
  }
}
