import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import QRCode from 'qrcode';
import { formatRupees } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { PageBar } from '../../components/PageBar.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { useBackToOrder, useRiderAction, useRiderDay } from './riderData.js';
import { upiPaymentLink } from './upiPaymentLink.js';

// The customer scans it with any UPI app; the money goes straight to the store.
function UpiQrCode({ link }) {
  const [imageUrl, setImageUrl] = useState(null);
  useEffect(() => {
    QRCode.toDataURL(link, { width: 640, margin: 1, errorCorrectionLevel: 'M' }).then(setImageUrl);
  }, [link]);
  return imageUrl ? <img className="upi-qr" src={imageUrl} alt="UPI payment QR code" /> : <div className="upi-qr" />;
}

function QrCard({ order, store }) {
  if (!store.upiId) return <p className="error-text" role="alert">The store UPI ID is not set. Ask the owner to add it in Store settings.</p>;
  const link = upiPaymentLink({ upiId: store.upiId, storeName: store.name, amount: order.total, orderNumber: order.orderNumber });
  return (
    <section className="card upi-card">
      <UpiQrCode link={link} />
      <strong>{store.name}</strong>
      <span className="hint">{store.upiId}</span>
    </section>
  );
}

export function RiderPaymentPage() {
  const orderNumber = Number(useParams().orderNumber);
  const { orders, data, error, loading, reload } = useRiderDay();
  const backToOrder = useBackToOrder(orderNumber);
  const action = useRiderAction(orderNumber, backToOrder);
  const order = orders.find((candidate) => candidate.orderNumber === orderNumber);
  return (
    <main className="app-shell">
      <PageBar title="Collect payment" />
      <div className="page-body upi-page">
        <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
        {order && (
          <>
            <p className="hint">Order #{order.orderNumber} · {order.address.customerName}</p>
            <p className="upi-amount">{formatRupees(order.total)}</p>
            <QrCard order={order} store={data.store} />
            <p className="hint centered-text">Amount and order number are filled in. Scan with GPay, PhonePe, Paytm or any UPI app.</p>
            {action.error && <p className="error-text" role="alert">{action.error}</p>}
            <div className="spacer" />
            <button type="button" className="button button-large" disabled={action.busy}
              onClick={() => window.confirm(`Seen ${formatRupees(order.total)} received in the store's UPI app?`) && action.run('payment', { method: 'upi' })}>
              <Icon name="check" /> UPI received
            </button>
            <button type="button" className="text-button" disabled={action.busy} onClick={() => action.run('payment', { method: 'cash' })}>
              Customer paid cash instead
            </button>
          </>
        )}
      </div>
    </main>
  );
}
