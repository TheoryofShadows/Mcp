/**
 * Honest marketplace purchasability.
 *
 * Paid listings only checkout via Stripe Connect destination charges when the
 * publisher has both a connected account and completed onboarding. Seed /
 * catalog tools without Connect must not look buyable.
 *
 * Free tools are always "purchasable" (no payment required).
 */
export function computePurchasable(row = {}) {
  const isPaid = row.price_type === "paid";
  if (!isPaid) {
    return { purchasable: true, purchase_blocked_reason: null };
  }
  const stripeReady = !!(row.stripe_account_id && row.stripe_onboarding_done);
  if (stripeReady) {
    return { purchasable: true, purchase_blocked_reason: null };
  }
  return {
    purchasable: false,
    purchase_blocked_reason: "Publisher payouts not enabled",
  };
}
