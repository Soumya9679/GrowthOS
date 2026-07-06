import { calculateSM2 } from './sm2';
import { describe, it, expect } from 'vitest';

describe('Spaced Repetition System (SuperMemo-2 algorithm)', () => {
  it('should reset repetitions to 0 if answer grade is less than 3', () => {
    const card = { interval: 6, ease: 2.5, repetitions: 3 };
    const grade = 1; // Failed review
    
    const result = calculateSM2(card.ease, card.repetitions, card.interval, grade);
    
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.ease).toBeLessThan(card.ease); // Ease factor should decay
  });

  it('should increment repetitions and calculate intervals on success (grade >= 3)', () => {
    // First success (rep = 0 -> interval = 1)
    let result = calculateSM2(2.5, 0, 0, 4);
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);

    // Second success (rep = 1 -> interval = 6)
    result = calculateSM2(result.ease, result.repetitions, result.interval, 4);
    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);

    // Third success (rep = 2 -> interval = ceil(6 * 2.5) = 15)
    result = calculateSM2(2.5, 2, 6, 5); // perfect recall keeps ease 2.5
    expect(result.repetitions).toBe(3);
    expect(result.interval).toBe(15);
  });

  it('should enforce a minimum ease factor limit of 1.3', () => {
    let result = calculateSM2(1.3, 2, 6, 0); // very poor grade
    expect(result.ease).toBe(1.3); // capped at 1.3
  });
});
