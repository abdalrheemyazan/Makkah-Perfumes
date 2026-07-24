import { describe, expect, it } from 'vitest';
import {
  isComplete,
  parseAnswers,
  QUESTIONS,
  scoreFamilies,
  type FinderAnswers,
} from '@/lib/fragrance-finder';

const DEEP_WINTER: FinderAnswers = {
  character: 'deep',
  occasion: 'evening',
  intensity: 'strong',
  notes: 'oud',
  season: 'winter',
};

const LIGHT_SUMMER: FinderAnswers = {
  character: 'fresh',
  occasion: 'daily',
  intensity: 'light',
  notes: 'citrus',
  season: 'summer',
};

describe('fragrance finder', () => {
  it('is deterministic — the same answers always rank identically', () => {
    const first = scoreFamilies(DEEP_WINTER);
    const second = scoreFamilies(DEEP_WINTER);
    expect(first).toEqual(second);
  });

  it('ranks oriental and incense highest for a deep, oud-leaning winter profile', () => {
    const ranked = scoreFamilies(DEEP_WINTER);
    const top = ranked.slice(0, 2).map((entry) => entry.family);
    expect(top).toContain('oriental');
    expect(top).toContain('leather-incense');
  });

  it('ranks fresh highest for a light summer profile', () => {
    const ranked = scoreFamilies(LIGHT_SUMMER);
    expect(ranked[0]!.family).toBe('fresh');
  });

  it('produces different rankings for opposing profiles', () => {
    expect(scoreFamilies(DEEP_WINTER)[0]!.family).not.toBe(
      scoreFamilies(LIGHT_SUMMER)[0]!.family,
    );
  });

  it('collects human-readable reasons for strong signals', () => {
    const oriental = scoreFamilies(DEEP_WINTER).find((entry) => entry.family === 'oriental');
    expect(oriental).toBeDefined();
    expect(oriental!.reasonsHe.length).toBeGreaterThan(0);
    expect(oriental!.reasonsHe).toContain('עמוק ומעושן');
  });

  it('scores nothing when no questions are answered', () => {
    expect(scoreFamilies({})).toEqual([]);
  });

  it('ignores unrecognised answer values rather than guessing', () => {
    const ranked = scoreFamilies({ character: 'not-a-real-answer', notes: 'citrus' });
    expect(ranked.every((entry) => entry.score > 0)).toBe(true);
    // Only the citrus answer contributed.
    expect(ranked[0]!.family).toBe('fresh');
  });

  it('breaks ties stably by family name', () => {
    const ranked = scoreFamilies(DEEP_WINTER);
    for (let i = 1; i < ranked.length; i += 1) {
      const previous = ranked[i - 1]!;
      const current = ranked[i]!;
      expect(previous.score).toBeGreaterThanOrEqual(current.score);
      if (previous.score === current.score) {
        expect(previous.family.localeCompare(current.family)).toBeLessThanOrEqual(0);
      }
    }
  });

  it('reports completeness only when every question is answered validly', () => {
    expect(isComplete(DEEP_WINTER)).toBe(true);
    expect(isComplete({ ...DEEP_WINTER, season: undefined })).toBe(false);
    expect(isComplete({ ...DEEP_WINTER, season: 'bogus' })).toBe(false);
    expect(isComplete({})).toBe(false);
  });

  it('parses answers from URL params and drops invalid ones', () => {
    const parsed = parseAnswers({
      character: 'deep',
      occasion: ['evening'],
      intensity: 'nonsense',
      notes: undefined,
    });
    expect(parsed).toEqual({ character: 'deep', occasion: 'evening' });
  });

  it('exposes five questions, each with at least two answers', () => {
    expect(QUESTIONS).toHaveLength(5);
    for (const question of QUESTIONS) {
      expect(question.answers.length).toBeGreaterThanOrEqual(2);
      // Every answer must influence at least one family, or it is dead weight.
      for (const answer of question.answers) {
        expect(Object.keys(answer.weights).length).toBeGreaterThan(0);
      }
    }
  });
});
