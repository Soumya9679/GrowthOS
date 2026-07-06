/**
 * Calculates the next interval, ease factor, and repetitions count
 * using the SuperMemo-2 (SM-2) algorithm.
 * 
 * @param ease Current ease factor of the card (default 2.5)
 * @param repetitions Current consecutive successful recall count
 * @param interval Current review interval in days
 * @param grade User's grade of recall quality from 0 to 5:
 *              0: "Total blackout", complete failure to recall
 *              1: Incorrect response; the correct one remembered upon reflection
 *              2: Incorrect response; where the correct one seemed easy to recall
 *              3: Correct response recalled with serious difficulty
 *              4: Correct response after a hesitation
 *              5: Perfect response
 */
export function calculateSM2(
  ease: number,
  repetitions: number,
  interval: number,
  grade: number
) {
  // If response grade is invalid, keep current stats
  if (grade < 0 || grade > 5) {
    return { ease, repetitions, interval };
  }

  let nextEase = ease;
  let nextRepetitions = repetitions;
  let nextInterval = interval;

  if (grade < 3) {
    // Failed recall: reset repetition count and schedule review for tomorrow
    nextRepetitions = 0;
    nextInterval = 1;
  } else {
    // Successful recall: calculate next repetition and interval
    if (nextRepetitions === 0) {
      nextInterval = 1;
    } else if (nextRepetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.ceil(interval * ease);
    }
    nextRepetitions += 1;
  }

  // Adjust Ease Factor (SM-2 formula)
  nextEase = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  
  // Enforce SM-2 minimum ease limit of 1.3
  if (nextEase < 1.3) {
    nextEase = 1.3;
  }

  return {
    ease: parseFloat(nextEase.toFixed(2)),
    repetitions: nextRepetitions,
    interval: nextInterval,
  };
}
