import { describe, expect, it } from 'vitest';
import { contactSchema } from '@/lib/validation';

/**
 * Contact form validation — the server-side guard that decides whether a row is
 * ever written. Browser validation is not trusted; this schema is.
 */

const valid = {
  name: 'ישראל ישראלי',
  email: 'Test@Example.com',
  phone: '',
  subject: 'שאלה על הזמנה',
  message: 'שלום, אשמח לקבל פרטים על זמני המשלוח להזמנה שלי.',
};

describe('contactSchema', () => {
  it('accepts a valid submission and normalizes the email', () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('test@example.com');
  });

  it('trims text fields', () => {
    const result = contactSchema.safeParse({ ...valid, name: '  ישראל  ', subject: '  נושא  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('ישראל');
      expect(result.data.subject).toBe('נושא');
    }
  });

  it('rejects a missing name', () => {
    expect(contactSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(contactSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a whitespace-only message', () => {
    expect(contactSchema.safeParse({ ...valid, message: '            ' }).success).toBe(false);
  });

  it('rejects a too-short message', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'קצר' }).success).toBe(false);
  });

  it('rejects an over-length message', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'א'.repeat(2001) }).success).toBe(false);
  });

  it('rejects an over-length subject', () => {
    expect(contactSchema.safeParse({ ...valid, subject: 'א'.repeat(121) }).success).toBe(false);
  });

  it('treats phone as optional', () => {
    expect(contactSchema.safeParse({ ...valid, phone: '' }).success).toBe(true);
  });

  it('validates a provided phone number', () => {
    expect(contactSchema.safeParse({ ...valid, phone: '050-123-4567' }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, phone: '12' }).success).toBe(false);
  });
});
