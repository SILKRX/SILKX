export interface LoanInput {
  price: number;
  /** Доля первоначального взноса, 0..1 */
  downPaymentShare: number;
  termMonths: number;
  /** Годовая ставка в процентах (0 — беспроцентная рассрочка) */
  annualRate: number;
}

export interface LoanResult {
  downPayment: number;
  principal: number;
  monthly: number;
  totalPaid: number;
  interest: number;
}

export const MORTGAGE_DEFAULT_RATE = 17;
export const MORTGAGE_TERMS_YEARS = { min: 1, max: 20, default: 15 } as const;
export const INSTALLMENT_TERMS_MONTHS = { min: 6, max: 36, default: 24 } as const;
export const DOWN_PAYMENT_SHARE = { min: 0.2, max: 0.9, default: 0.3, step: 0.05 } as const;

/** Аннуитетный платёж: P·r / (1 − (1 + r)^−n), при r = 0 — равные доли. */
export function annuityPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function calculateLoan(input: LoanInput): LoanResult {
  const share = Math.min(Math.max(input.downPaymentShare, 0), 1);
  const downPayment = Math.round(input.price * share);
  const principal = Math.max(input.price - downPayment, 0);
  const monthly = annuityPayment(principal, input.annualRate, input.termMonths);
  const totalPaid = monthly * input.termMonths;
  const interest = Math.max(totalPaid - principal, 0);
  return {
    downPayment,
    principal,
    monthly: Math.round(monthly),
    totalPaid: Math.round(totalPaid),
    interest: Math.round(interest),
  };
}
