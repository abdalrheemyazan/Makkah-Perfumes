/**
 * Fragrance finder.
 *
 * A deterministic, auditable rule table — the same answers always produce the
 * same ranking. Nothing here is random, and nothing invents facts about a
 * product: scoring runs on the fragrance *family*, which is the only
 * classification the catalogue currently holds.
 *
 * Once verified fragrance notes arrive from the brand, note-level scoring can be
 * layered on top without changing this interface.
 *
 * Pure module — no server imports, so it is unit-testable and usable on either side.
 */

export type FamilySlug =
  | 'oriental'
  | 'woody'
  | 'floral'
  | 'fresh'
  | 'amber-musk'
  | 'leather-incense'
  | 'vanilla-sweet';

export type QuestionId = 'character' | 'occasion' | 'intensity' | 'notes' | 'season';

export type Answer = {
  value: string;
  labelHe: string;
  /** Optional supporting line shown under the label on the choice card. */
  descriptionHe?: string;
  /** Points added per family. Absent families score zero. */
  weights: Partial<Record<FamilySlug, number>>;
};

export type Question = {
  id: QuestionId;
  promptHe: string;
  /** Short label for the progress stepper (e.g. "סגנון"). */
  shortLabelHe: string;
  /** Optional one-line clarification under the question title. */
  helpHe?: string;
  /** When true the question accepts more than one answer (checkbox semantics). */
  multiple?: boolean;
  answers: Answer[];
};

export const QUESTIONS: readonly Question[] = [
  {
    id: 'character',
    promptHe: 'איזה סגנון ניחוח אתם אוהבים?',
    shortLabelHe: 'סגנון',
    helpHe: 'הבחירה הזו קובעת את אופי הניחוח הכללי.',
    answers: [
      { value: 'fresh', labelHe: 'רענן ונקי', descriptionHe: 'קליל, בהיר ומלא אנרגיה', weights: { fresh: 3, floral: 1 } },
      { value: 'warm', labelHe: 'חם ועוטף', descriptionHe: 'עמוק, רך ומלא נוכחות', weights: { 'amber-musk': 3, 'vanilla-sweet': 2 } },
      { value: 'deep', labelHe: 'עמוק ומעושן', descriptionHe: 'עצים, קטורת ותווים כהים', weights: { 'leather-incense': 3, oriental: 2 } },
      { value: 'sweet', labelHe: 'מתוק ורך', descriptionHe: 'וניל, ענבר ומרקם נעים', weights: { 'vanilla-sweet': 3, floral: 1 } },
    ],
  },
  {
    id: 'occasion',
    promptHe: 'מתי תרצו להשתמש בבושם?',
    shortLabelHe: 'שימוש',
    answers: [
      { value: 'daily', labelHe: 'ביום־יום', descriptionHe: 'לשגרה ולשעות היום', weights: { fresh: 2, floral: 1, woody: 1 } },
      { value: 'work', labelHe: 'בעבודה', descriptionHe: 'מרוסן ומקצועי', weights: { woody: 2, fresh: 1 } },
      { value: 'evening', labelHe: 'לערב ולאירועים', descriptionHe: 'נוכח יותר, למפגשים', weights: { oriental: 3, 'amber-musk': 2 } },
      { value: 'special', labelHe: 'לאירועים מיוחדים', descriptionHe: 'לרגעים שדורשים חתימה', weights: { oriental: 2, 'leather-incense': 2 } },
    ],
  },
  {
    id: 'intensity',
    promptHe: 'איזו עוצמה אתם מעדיפים?',
    shortLabelHe: 'עוצמה',
    answers: [
      { value: 'light', labelHe: 'עדינה ומרוסנת', descriptionHe: 'קרובה לעור, אינטימית', weights: { fresh: 3, floral: 2 } },
      { value: 'medium', labelHe: 'מאוזנת', descriptionHe: 'נוכחות מדודה', weights: { woody: 2, 'amber-musk': 2, floral: 1 } },
      { value: 'strong', labelHe: 'נוכחת ועזה', descriptionHe: 'עקבות ריח מורגשים', weights: { oriental: 3, 'leather-incense': 3 } },
    ],
  },
  {
    id: 'notes',
    promptHe: 'אילו תווים מושכים אתכם?',
    shortLabelHe: 'תווים',
    helpHe: 'ניתן לבחור יותר מתשובה אחת.',
    multiple: true,
    answers: [
      { value: 'citrus', labelHe: 'הדרים ותווים ארומטיים', descriptionHe: 'לימון, ברגמוט ועשבי תיבול', weights: { fresh: 3 } },
      { value: 'flowers', labelHe: 'ורד ופרחים', descriptionHe: 'ורד, יסמין ותווים פרחוניים', weights: { floral: 3 } },
      { value: 'oud', labelHe: 'עוד ושרפים', descriptionHe: 'עוד, לבונה ותווים שרפיים', weights: { oriental: 3, 'leather-incense': 2 } },
      { value: 'woods', labelHe: 'עצים וסנדל', descriptionHe: 'סנדל, ארז ועצים יבשים', weights: { woody: 3 } },
      { value: 'vanilla', labelHe: 'וניל וקרמל', descriptionHe: 'וניל, קרמל ותווים מתוקים', weights: { 'vanilla-sweet': 3 } },
      { value: 'amber', labelHe: 'ענבר ומושק', descriptionHe: 'ענבר, מושק וחום עוטף', weights: { 'amber-musk': 3 } },
    ],
  },
  {
    id: 'season',
    promptHe: 'באיזו עונה תשתמשו בו בעיקר?',
    shortLabelHe: 'עונה',
    answers: [
      { value: 'summer', labelHe: 'קיץ', descriptionHe: 'קליל ומאוורר', weights: { fresh: 3, floral: 1 } },
      { value: 'winter', labelHe: 'חורף', descriptionHe: 'חם ועוטף', weights: { oriental: 2, 'amber-musk': 2, 'leather-incense': 2 } },
      { value: 'allyear', labelHe: 'כל השנה', descriptionHe: 'מאוזן לכל עונה', weights: { woody: 2, 'amber-musk': 1, floral: 1 } },
    ],
  },
] as const;

export type FinderAnswers = Partial<Record<QuestionId, string>>;

export type FamilyScore = {
  family: FamilySlug;
  score: number;
  /** Which answers contributed, for the "why this fits" explanation. */
  reasonsHe: string[];
};

/** Scores every family against the given answers. Deterministic and total. */
export function scoreFamilies(answers: FinderAnswers): FamilyScore[] {
  const scores = new Map<FamilySlug, { score: number; reasonsHe: string[] }>();

  for (const question of QUESTIONS) {
    const chosen = answers[question.id];
    if (!chosen) continue;

    const answer = question.answers.find((option) => option.value === chosen);
    if (!answer) continue; // Unknown value in the URL is ignored, never guessed.

    for (const [family, weight] of Object.entries(answer.weights) as [FamilySlug, number][]) {
      const entry = scores.get(family) ?? { score: 0, reasonsHe: [] };
      entry.score += weight;
      // Only the strong signals are worth explaining.
      if (weight >= 2) entry.reasonsHe.push(answer.labelHe);
      scores.set(family, entry);
    }
  }

  return [...scores.entries()]
    .map(([family, entry]) => ({ family, score: entry.score, reasonsHe: entry.reasonsHe }))
    // Sort by score, then alphabetically, so ties are stable rather than arbitrary.
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family));
}

/** Selections keyed by question — arrays, so multi-select questions are native. */
export type FinderSelections = Partial<Record<QuestionId, string[]>>;

/**
 * Scores families from array selections (supports multi-select questions).
 * A superset of `scoreFamilies`: single-select questions simply carry a
 * one-element array. Same deterministic weighting and tie-breaking.
 */
export function scoreSelections(selections: FinderSelections): FamilyScore[] {
  const scores = new Map<FamilySlug, { score: number; reasonsHe: string[] }>();

  for (const question of QUESTIONS) {
    const chosen = selections[question.id];
    if (!chosen || chosen.length === 0) continue;

    for (const value of chosen) {
      const answer = question.answers.find((option) => option.value === value);
      if (!answer) continue;

      for (const [family, weight] of Object.entries(answer.weights) as [FamilySlug, number][]) {
        const entry = scores.get(family) ?? { score: 0, reasonsHe: [] };
        entry.score += weight;
        if (weight >= 2) entry.reasonsHe.push(answer.labelHe);
        scores.set(family, entry);
      }
    }
  }

  return [...scores.entries()]
    .map(([family, entry]) => ({ family, score: entry.score, reasonsHe: entry.reasonsHe }))
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family));
}

/** True once every question has at least one recognised selection. */
export function isSelectionComplete(selections: FinderSelections): boolean {
  return QUESTIONS.every((question) => {
    const chosen = selections[question.id];
    return (
      chosen != null &&
      chosen.length > 0 &&
      chosen.every((value) => question.answers.some((option) => option.value === value))
    );
  });
}

/** True once every question has a recognised answer. */
export function isComplete(answers: FinderAnswers): boolean {
  return QUESTIONS.every((question) => {
    const chosen = answers[question.id];
    return chosen !== undefined && question.answers.some((option) => option.value === chosen);
  });
}

/** Builds the Hebrew explanation shown beside a recommendation. */
export function explanationHe(score: FamilyScore, familyNameHe: string): string {
  const unique = [...new Set(score.reasonsHe)];
  if (unique.length === 0) {
    return `מתאים למשפחת ${familyNameHe} על סמך התשובות שלכם.`;
  }
  return `נבחר בזכות ${unique.join(', ')} — מאפיינים שמובילים למשפחת ${familyNameHe}.`;
}

/** Reads answers out of URL search params, ignoring anything unrecognised. */
export function parseAnswers(
  params: Record<string, string | string[] | undefined>,
): FinderAnswers {
  const answers: FinderAnswers = {};
  for (const question of QUESTIONS) {
    const raw = params[question.id];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && question.answers.some((option) => option.value === value)) {
      answers[question.id] = value;
    }
  }
  return answers;
}
