export type FragranceSourceTier = 'TOP' | 'HEART' | 'BASE' | 'KEY';

export type FragranceSourceNote = {
  nameHe: string;
  nameEn: string;
  slug: string;
  tier: FragranceSourceTier;
};

export type FragranceContent = {
  slug: string;
  publicTitleHe?: string;
  descriptionHe: string;
  family: (typeof FRAGRANCE_FAMILIES)[number];
  launchYear: number;
  perfumers: readonly string[];
  noteStructure: 'PYRAMID' | 'KEY';
  notes: readonly FragranceSourceNote[];
  sourceUrl: string;
};

export const FRAGRANCE_FAMILIES = [
  { slug: 'leather', nameHe: 'עור', accentColor: '#6f5138', position: 1 },
  { slug: 'floral-woody-musky', nameHe: 'פרחוני־עצי־מושקי', accentColor: '#8c5967', position: 2 },
  { slug: 'oriental-woody', nameHe: 'מזרחי־עצי', accentColor: '#8a623f', position: 3 },
  { slug: 'chypre-floral', nameHe: 'שיפרה־פרחוני', accentColor: '#6e6b4a', position: 4 },
  { slug: 'oriental-floral', nameHe: 'מזרחי־פרחוני', accentColor: '#8c4a57', position: 5 },
  { slug: 'oriental-fougere', nameHe: 'מזרחי־פוג׳רי', accentColor: '#526a60', position: 6 },
  { slug: 'aromatic-fruity', nameHe: 'ארומטי־פירותי', accentColor: '#4a6b72', position: 7 },
  { slug: 'oriental-spicy', nameHe: 'מזרחי־מתובל', accentColor: '#9a542e', position: 8 },
  { slug: 'oriental-vanilla', nameHe: 'מזרחי־ונילי', accentColor: '#a8763f', position: 9 },
] as const;

function family(slug: (typeof FRAGRANCE_FAMILIES)[number]['slug']) {
  return FRAGRANCE_FAMILIES.find((item) => item.slug === slug)!;
}

function note(tier: FragranceSourceTier, nameHe: string, nameEn: string): FragranceSourceNote {
  return {
    tier,
    nameHe,
    nameEn,
    slug: nameEn
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  };
}

export const FRAGRANCE_CONTENT: readonly FragranceContent[] = [
  {
    slug: 'royal-leather',
    publicTitleHe: 'רויאל לת׳ר',
    descriptionHe: 'ניחוח עור יוניסקס בעל אופי חם, מעושן ועצי. הפתיחה משלבת זעפרן וסיגלית, הלב מדגיש עור וקטורת, והבסיס מוסיף עומק באמצעות עץ גואיאק ומושק.',
    family: family('leather'),
    launchYear: 2026,
    perfumers: ['Hassan Al Murazza', 'Waleed Alabadi'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'זעפרן', 'Saffron'), note('TOP', 'סיגלית', 'Violet'),
      note('HEART', 'עור', 'Leather'), note('HEART', 'קטורת', 'Incense'),
      note('BASE', 'עץ גואיאק', 'Guaiac Wood'), note('BASE', 'מושק', 'Musk'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Royal-Leather-125374.html',
  },
  {
    slug: 'blossom-candy',
    descriptionHe: 'ניחוח פרחוני, רך ומתוק שנפתח במנדרינה, אפרסק ויסמין. בלב נמצאים ורד, אדמונית ושושנת העמקים, והבסיס משלב וניל, טונקה, אלגום ומושק.',
    family: family('floral-woody-musky'),
    launchYear: 2026,
    perfumers: ['Hassan Al Murazza', 'Waleed Alabadi'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'מנדרינה', 'Mandarin'), note('TOP', 'יסמין', 'Jasmine'), note('TOP', 'אפרסק', 'Peach'),
      note('HEART', 'שושנת העמקים', 'Lily of the Valley'), note('HEART', 'אדמונית', 'Peony'), note('HEART', 'ורד', 'Rose'),
      note('BASE', 'אלגום', 'Sandalwood'), note('BASE', 'פולי טונקה', 'Tonka Bean'), note('BASE', 'וניל', 'Vanilla'), note('BASE', 'מושק', 'Musk'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Blossom-Candy-125375.html',
  },
  {
    slug: 'oud-embrace',
    descriptionHe: 'ניחוח מזרחי־עצי שנפתח בברגמוט, אשכולית ותווים פרחוניים. פלפל ורוד, ורד דמשקאי ואמברגריס בונים לב עשיר, מעל בסיס של עץ גואיאק, פצ׳ולי ואמברגריס.',
    family: family('oriental-woody'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'תווים פרחוניים', 'Floral Notes'), note('TOP', 'אשכולית', 'Grapefruit'), note('TOP', 'ברגמוט', 'Bergamot'),
      note('HEART', 'פלפל ורוד', 'Pink Pepper'), note('HEART', 'אמברגריס', 'Ambergris'), note('HEART', 'ורד דמשקאי', 'Damask Rose'),
      note('BASE', 'עץ גואיאק', 'Guaiac Wood'), note('BASE', 'אמברגריס', 'Ambergris'), note('BASE', 'פצ׳ולי', 'Patchouli'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Oud-Embrace-114818.html',
  },
  {
    slug: 'luban',
    descriptionHe: 'ניחוח מזרחי־עצי הבנוי סביב לבונה וקטורת. הפתיחה משלבת מנדרינה, אלדהידים, אנג׳ליקה, מאטה ותה; הלב מחבר לבונה, מגנוליה ודיו; והבסיס כולל פצ׳ולי, ארז, לבדנום, וטיבר, קטורת וענבר.',
    family: family('oriental-woody'),
    launchYear: 2007,
    perfumers: [],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'מנדרינה', 'Mandarin Orange'), note('TOP', 'אלדהידים', 'Aldehydes'), note('TOP', 'אנג׳ליקה', 'Angelica'), note('TOP', 'מאטה', 'Mate'), note('TOP', 'תה', 'Tea'),
      note('HEART', 'לבונה', 'Frankincense'), note('HEART', 'מגנוליה', 'Magnolia'), note('HEART', 'דיו', 'Ink'),
      note('BASE', 'פצ׳ולי', 'Patchouli'), note('BASE', 'עץ ארז', 'Cedarwood'), note('BASE', 'לבדנום', 'Labdanum'), note('BASE', 'וטיבר', 'Vetiver'), note('BASE', 'קטורת', 'Incense'), note('BASE', 'ענבר', 'Amber'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Luban-114808.html',
  },
  {
    slug: 'amber-incense',
    descriptionHe: 'ניחוח מזרחי־עצי שמחבר בין הרעננות החריפה של ג׳ינג׳ר וזעפרן לבין לבונה, ענבר ומושק. התוצאה מציגה ניגוד בין פתיחה מתובלת לבסיס חם ושרפי.',
    family: family('oriental-woody'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'KEY',
    notes: [
      note('KEY', 'ג׳ינג׳ר', 'Ginger'), note('KEY', 'לבונה', 'Frankincense'), note('KEY', 'זעפרן', 'Saffron'), note('KEY', 'ענבר', 'Amber'), note('KEY', 'מושק', 'Musk'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Amber-Icense-114814.html',
  },
  {
    slug: 'pure-essence',
    descriptionHe: 'ניחוח שיפרה־פרחוני שנפתח בפלפל ורוד, אשכולית ומנדרינה. עלי סיגלית, יסמין וורד יוצרים לב פרחוני ורענן, והבסיס נשען על פצ׳ולי, עץ ארז וטחב.',
    family: family('chypre-floral'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'פלפל ורוד', 'Pink Pepper'), note('TOP', 'אשכולית', 'Grapefruit'), note('TOP', 'מנדרינה', 'Mandarin'),
      note('HEART', 'עלי סיגלית', 'Violet Leaf'), note('HEART', 'יסמין', 'Jasmine'), note('HEART', 'ורד', 'Rose'),
      note('BASE', 'פצ׳ולי', 'Patchouli'), note('BASE', 'עץ ארז', 'Cedarwood'), note('BASE', 'טחב', 'Moss'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Pure-Essence-114813.html',
  },
  {
    slug: 'luxe-rose',
    descriptionHe: 'ניחוח מזרחי־פרחוני המעמיד את הוורד הבולגרי במרכז, לצד זעפרן, עוד ומושק. השילוב יוצר אופי ורדי, חם, עצי ומושקי.',
    family: family('oriental-floral'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'KEY',
    notes: [
      note('KEY', 'זעפרן', 'Saffron'), note('KEY', 'מושק', 'Musk'), note('KEY', 'עוד', 'Oud'), note('KEY', 'ורד בולגרי', 'Bulgarian Rose'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Luxe-Rose-114812.html',
  },
  {
    slug: 'amour-touch',
    descriptionHe: 'ניחוח מזרחי־פרחוני בעל פתיחה מתובלת ורעננה של פלפל שחור, אשכולית ובזיליקום. בלב מופיעים שושנת העמקים, סיגלית וורד, והבסיס משלב אמברגריס, וטיבר, ארז וענבר.',
    family: family('oriental-floral'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'פלפל שחור', 'Black Pepper'), note('TOP', 'אשכולית', 'Grapefruit'), note('TOP', 'בזיליקום', 'Basil'),
      note('HEART', 'שושנת העמקים', 'Lily of the Valley'), note('HEART', 'סיגלית', 'Violet'), note('HEART', 'ורד', 'Rose'),
      note('BASE', 'אמברגריס', 'Ambergris'), note('BASE', 'וטיבר', 'Vetiver'), note('BASE', 'עץ ארז', 'Cedar'), note('BASE', 'ענבר', 'Amber'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Amour-Touch-114811.html',
  },
  {
    slug: 'adventure',
    descriptionHe: 'ניחוח מזרחי־פוג׳רי עם פתיחה הדרית של ברגמוט קלברי, לימון ותפוז סיציליאני. פריחת תפוז, קינמון וג׳ינג׳ר מוסיפים חום, והבסיס מחבר תה שחור סיני, לבונה, עץ גואיאק ואמברוקסן.',
    family: family('oriental-fougere'),
    launchYear: 2022,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'ברגמוט קלברי', 'Calabrian Bergamot'), note('TOP', 'לימון', 'Lemon'), note('TOP', 'תפוז סיציליאני', 'Sicilian Orange'),
      note('HEART', 'פריחת תפוז תוניסאית', 'Tunisian Orange Blossom'), note('HEART', 'קינמון', 'Cinnamon'), note('HEART', 'ג׳ינג׳ר', 'Ginger'),
      note('BASE', 'תה שחור סיני', 'Chinese Black Tea'), note('BASE', 'לבונה', 'Frankincense'), note('BASE', 'עץ גואיאק', 'Guaiac Wood'), note('BASE', 'אמברוקסן', 'Ambroxan'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Adventure-114809.html',
  },
  {
    slug: 'storm-blue',
    descriptionHe: 'ניחוח ארומטי־פירותי שנפתח בהדרים, תפוח אדום, דומדמניות שחורות ותות. יסמין, אפונה ריחנית, פרזיה וורד יוצרים לב פרחוני, והבסיס משלב אלגום, מושק, ענבר ופטל.',
    family: family('aromatic-fruity'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'הדרים', 'Citruses'), note('TOP', 'תפוח אדום', 'Red Apple'), note('TOP', 'דומדמניות שחורות', 'Black Currant'), note('TOP', 'תות', 'Strawberry'),
      note('HEART', 'יסמין', 'Jasmine'), note('HEART', 'אפונה ריחנית', 'Sweet Pea'), note('HEART', 'פרזיה', 'Freesia'), note('HEART', 'ורד', 'Rose'),
      note('BASE', 'אלגום', 'Sandalwood'), note('BASE', 'מושק', 'Musk'), note('BASE', 'ענבר', 'Amber'), note('BASE', 'פטל', 'Raspberry'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Storm-Blue-118464.html',
  },
  {
    slug: 'courage',
    descriptionHe: 'ניחוח מזרחי־עצי שנפתח בפריחת תפוז, הדרים וארז. הלב משלב ענבר, תווים מתוקים ומושק לבן, והבסיס מעניק מעטפת רכה של אלגום ומושק.',
    family: family('oriental-woody'),
    launchYear: 2025,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'פריחת תפוז', 'Orange Blossom'), note('TOP', 'הדרים', 'Citrus'), note('TOP', 'עץ ארז', 'Cedar'),
      note('HEART', 'ענבר', 'Amber'), note('HEART', 'תווים מתוקים', 'Sweet Notes'), note('HEART', 'מושק לבן', 'White Musk'),
      note('BASE', 'אלגום', 'Sandalwood'), note('BASE', 'מושק', 'Musk'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Courage-114966.html',
  },
  {
    slug: 'atheel',
    descriptionHe: 'ניחוח מזרחי־מתובל שנפתח בזעפרן וורד. אלגום ושעוות דבורים מוסיפים חמימות ומרקם ללב, בעוד עור ווטיבר יוצרים בסיס עמוק, עצי ויבש.',
    family: family('oriental-spicy'),
    launchYear: 2023,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'זעפרן', 'Saffron'), note('TOP', 'ורד', 'Rose'),
      note('HEART', 'אלגום', 'Sandalwood'), note('HEART', 'שעוות דבורים', 'Beeswax'),
      note('BASE', 'עור', 'Leather'), note('BASE', 'וטיבר', 'Vetiver'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Atheel-114810.html',
  },
  {
    slug: 'precious-vanilla',
    descriptionHe: 'ניחוח מזרחי־ונילי שבו ורד, וניל ומושק פותחים את הקומפוזיציה. מגנוליה, פריחת תפוח ושכבה נוספת של וניל מרכיבות את הלב, והבסיס משלב עשן ומושק.',
    family: family('oriental-vanilla'),
    launchYear: 2024,
    perfumers: ['Hassan Al Murazza'],
    noteStructure: 'PYRAMID',
    notes: [
      note('TOP', 'ורד', 'Rose'), note('TOP', 'וניל', 'Vanilla'), note('TOP', 'מושק', 'Musk'),
      note('HEART', 'מגנוליה', 'Magnolia'), note('HEART', 'וניל', 'Vanilla'), note('HEART', 'פריחת תפוח', 'Apple Blossom'),
      note('BASE', 'עשן', 'Smoke'), note('BASE', 'מושק', 'Musk'),
    ],
    sourceUrl: 'https://www.fragrantica.com/perfume/Makkah-Perfumes/Precious-Vanilla-114967.html',
  },
] as const;

export const FRAGRANCE_CONTENT_BY_SLUG = new Map(
  FRAGRANCE_CONTENT.map((item) => [item.slug, item] as const),
);
