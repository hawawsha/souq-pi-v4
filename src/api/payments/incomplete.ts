// Simulated API Route: /api/payments/incomplete
export async function handleIncompletePayment(paymentId: string) {
  console.log(`[API] INCOMPLETE payment handled: ${paymentId} — logged for recovery`);
  return { success: true, message: 'Payment marked for manual review' };
}
