// The UPI link inside the QR code: the store's UPI ID, the exact amount and
// the order number as the payment note. Any UPI app understands it.
export function upiPaymentLink({ upiId, storeName, amount, orderNumber }) {
  const parameters = new URLSearchParams({ pa: upiId, pn: storeName, am: amount.toFixed(2), cu: 'INR', tn: `Order ${orderNumber}` });
  return `upi://pay?${parameters.toString().replace(/\+/g, '%20')}`;
}
