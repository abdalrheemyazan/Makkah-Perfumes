import 'server-only';

/**
 * Payment provider adapter.
 *
 * No real provider has been selected yet (docs/MISSING_BUSINESS_DATA.md §1.4),
 * so the only implementation is a development one. It is honest about what it
 * is: it does not render a fake credit-card form, it does not pretend a charge
 * happened at a bank, and it never touches a card number. What it *does* do is
 * exercise the real order pipeline, so swapping in a live provider later is a
 * matter of adding one file, not rewriting checkout.
 *
 * To add a real provider:
 *   1. Implement `PaymentProvider` (e.g. src/lib/commerce/providers/tranzila.ts).
 *   2. Register it in `getPaymentProvider`.
 *   3. Set PAYMENT_PROVIDER + credentials in .env.
 * Card data must go directly from the browser to the provider — it must never
 * reach this server. See docs/DEPLOYMENT.md.
 */

export type PaymentIntent = {
  orderId: string;
  orderNumber: string;
  amountAgorot: number;
  customerEmail: string;
};

export type PaymentResult =
  | {
      ok: true;
      providerReference: string;
      /** True when no money actually moved. */
      isDevelopment: boolean;
      /** Where to send the customer next, when the provider is hosted. */
      redirectUrl?: string;
    }
  | { ok: false; errorHe: string; failureCode: string };

export interface PaymentProvider {
  readonly id: string;
  /** Whether this provider settles real money. */
  readonly isLive: boolean;
  authorize(intent: PaymentIntent): Promise<PaymentResult>;
  refund(providerReference: string, amountAgorot: number): Promise<PaymentResult>;
}

/**
 * Development provider.
 *
 * Approves any order and records a traceable reference so the resulting row is
 * obviously non-live. Orders it creates are flagged `isDevelopmentOrder` and are
 * badged as such throughout the customer and admin interfaces.
 */
class DevelopmentPaymentProvider implements PaymentProvider {
  readonly id = 'development';
  readonly isLive = false;

  async authorize(intent: PaymentIntent): Promise<PaymentResult> {
    if (intent.amountAgorot <= 0) {
      return {
        ok: false,
        errorHe: 'סכום התשלום אינו תקין.',
        failureCode: 'invalid_amount',
      };
    }
    return {
      ok: true,
      providerReference: `DEV-${intent.orderNumber}`,
      isDevelopment: true,
    };
  }

  async refund(providerReference: string): Promise<PaymentResult> {
    return {
      ok: true,
      providerReference: `DEV-REFUND-${providerReference}`,
      isDevelopment: true,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER ?? 'development';

  switch (configured) {
    case 'development':
      return new DevelopmentPaymentProvider();
    default:
      // Fail loudly rather than silently taking orders that will never be paid.
      throw new Error(
        `PAYMENT_PROVIDER="${configured}" is not implemented. ` +
          'Implement the adapter and register it in getPaymentProvider(), or set PAYMENT_PROVIDER=development.',
      );
  }
}

/** True while checkout is running without a real payment gateway. */
export function isDevelopmentPaymentMode(): boolean {
  return !getPaymentProvider().isLive;
}
