// Pi SDK Client Initialization - Compatible with Pi Browser
declare global {
  interface Window {
    Pi?: {
      init: (config: { version: string; sandbox?: boolean }) => void;
      authenticate: (scopes: string[], onIncompletePaymentFound: (payment: any) => void) => Promise<any>;
      createPayment: (paymentData: any, callbacks: any) => Promise<any>;
      openShareDialog: (title: string, message: string) => void;
    };
  }
}

export const PI_APP_NAME = 'PiStore - Premium Electronics';

export function initPiSDK() {
  if (typeof window !== 'undefined' && window.Pi) {
    window.Pi.init({ version: '2.0', sandbox: true });
    return true;
  }
  return false;
}

export async function authenticateWithPi(onIncompletePaymentFound: (payment: any) => void) {
  if (!window.Pi) {
    throw new Error('Pi Browser required. Please open in Pi Browser.');
  }
  return window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound);
}

export async function createPiPayment(
  amount: number,
  memo: string,
  metadata: any,
  onReadyForServerApproval: (paymentId: string) => void,
  onReadyForServerCompletion: (paymentId: string, txid: string) => void,
  onCancel: (paymentId: string) => void,
  onError: (error: any, payment?: any) => void
) {
  if (!window.Pi) throw new Error('Pi SDK not available');

  return window.Pi.createPayment(
    { amount, memo, metadata },
    {
      onReadyForServerApproval,
      onReadyForServerCompletion,
      onCancel,
      onError,
    }
  );
}
