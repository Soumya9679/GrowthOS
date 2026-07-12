# Spaced Repetition and Active Recall Frameworks

## Active Recall Heuristic
Active recall is the practice of actively testing your memory during learning. Instead of passively reading or highlighting notes, force your brain to retrieve the information. Retrospective revision sheets and flashcards are highly effective active recall drivers.

## Spaced Repetition (SuperMemo-2 Algorithm)
Spaced repetition spaces out review intervals based on how well you remember the concepts. GrowthOS implements the SuperMemo-2 (SM-2) algorithm. The intervals are calculated as follows:
- **repetitions (n) = 0**: interval = 0, next review is immediate.
- **repetitions (n) = 1**: interval = 1 day.
- **repetitions (n) = 2**: interval = 6 days.
- **repetitions (n) > 2**: interval = prev_interval * ease_factor.

The ease factor (ease) starts at 2.5 and updates based on a self-assessed grade (0 to 5):
`ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))`
If the grade is less than 3, repetitions resets to 0 and the review interval is reset to 1 day.

## Cognitive Load Management
Do not study for more than 50 minutes continuously. The brain experience fatigue and memory retrieval performance decays. Space study cycles using Pomodoro timers (e.g. 25-5 or 50-10) to optimize focus.
