import { z } from 'zod';

/**
 * Shared Zod schemas. Every message is Hebrew because these strings are shown
 * directly to the customer — validation is part of the interface, not an
 * afterthought bolted on in English.
 */

/**
 * Israeli phone numbers, accepting the common written forms:
 *   050-123-4567 · 0501234567 · +972 50 123 4567 · 03-1234567
 * Also accepts a generic international form so overseas customers are not blocked.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'יש להזין מספר טלפון')
  .transform((value) => value.replace(/[\s\-().]/g, ''))
  .refine(
    (value) => /^0(5\d|[2-489]|7\d)\d{7}$/.test(value) || /^\+\d{8,15}$/.test(value),
    'מספר הטלפון אינו תקין',
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'יש להזין כתובת דוא״ל')
  .max(254, 'כתובת הדוא״ל ארוכה מדי')
  .email('כתובת הדוא״ל אינה תקינה')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים')
  .max(200, 'הסיסמה ארוכה מדי')
  .refine((value) => /[A-Za-z]/.test(value), 'הסיסמה חייבת להכיל לפחות אות אחת')
  .refine((value) => /\d/.test(value), 'הסיסמה חייבת להכיל לפחות ספרה אחת');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'השם קצר מדי')
  .max(60, 'השם ארוך מדי');

export const newsletterSchema = z.object({
  email: emailSchema,
  // Israeli anti-spam law requires explicit, recorded opt-in.
  consent: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .refine((value) => value === 'on' || value === 'true' || value === true, {
      message: 'יש לאשר את קבלת הדיוור',
    }),
});

export const israeliAddressSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  street: z.string().trim().min(2, 'יש להזין שם רחוב').max(100),
  houseNumber: z.string().trim().min(1, 'יש להזין מספר בית').max(10),
  apartment: z.string().trim().max(10).optional().or(z.literal('')),
  entrance: z.string().trim().max(10).optional().or(z.literal('')),
  floor: z.string().trim().max(10).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'יש להזין עיר').max(60),
  // Israeli postal codes are 7 digits, but are optional at checkout.
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(\d{2})?$/, 'המיקוד אינו תקין')
    .optional()
    .or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'יש להזין סיסמה'),
});

export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptsMarketing: z.coerce.boolean().optional().default(false),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  deliveryMethod: z.enum(['STANDARD_DELIVERY', 'EXPRESS_DELIVERY', 'STORE_PICKUP']),
  address: israeliAddressSchema,
  customerNote: z.string().trim().max(500).optional().or(z.literal('')),
});

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  message: z.string().trim().min(10, 'ההודעה קצרה מדי').max(2000, 'ההודעה ארוכה מדי'),
});

/** Flattens Zod issues into a `{ field: message }` map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
