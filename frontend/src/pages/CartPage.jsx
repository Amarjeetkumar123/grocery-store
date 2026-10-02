import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { useCartQuote } from '../cart/useCartQuote.js';
import { callApi } from '../apiClient.js';
import { useApiData } from '../useApiData.js';
import { deliveryAddressLine, formatRupees } from '../formatting.js';
import { Icon } from '../Icon.jsx';
import { PageBar } from '../components/PageBar.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { CartLines } from './cart/CartLines.jsx';
import { SlotPicker, slotKeyOf } from './cart/SlotPicker.jsx';
import { BillSummary } from './cart/BillSummary.jsx';

function DeliveryAddressCard({ profile }) {
  return (
    <section className="card address-card">
      <span className="benefit-icon"><Icon name="pin" /></span>
      <div className="address-card-text">
        <p className="hint">Delivering to</p>
        <p className="address-card-line">{deliveryAddressLine(profile)}</p>
      </div>
      <Link to="/address" className="text-button small-text-button">Change</Link>
    </section>
  );
}

function EmptyCart() {
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>Cart</h1></header>
      <div className="page-body centered-block">
        <span className="benefit-icon"><Icon name="cart" /></span>
        <p>Your cart is empty.</p>
        <Link to="/" className="button button-outline">Start shopping</Link>
      </div>
      <TabBar />
    </main>
  );
}

// The first open slot is chosen until the customer picks another.
function useChosenSlot(slotsRequest) {
  const [chosenSlotKey, setChosenSlotKey] = useState(null);
  const openSlots = (slotsRequest.data?.slots ?? []).filter((slot) => slot.placesLeft > 0);
  const chosenSlot = openSlots.find((slot) => slotKeyOf(slot) === chosenSlotKey) ?? openSlots[0] ?? null;
  return [chosenSlot, setChosenSlotKey];
}

// Items the store no longer has at all are taken out of the cart.
function useRemoveVanishedItems(cart) {
  const { setQuantity } = useCart();
  const removedIdsKey = (cart?.removedPackSizeIds ?? []).join(',');
  useEffect(() => {
    if (removedIdsKey) removedIdsKey.split(',').forEach((packSizeId) => setQuantity(Number(packSizeId), 0));
  }, [removedIdsKey, setQuantity]);
}

function usePlaceOrder({ items, chosenSlot, quote, slotsRequest }) {
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [state, setState] = useState({ placing: false, error: null });

  async function placeOrder() {
    setState({ placing: true, error: null });
    try {
      const body = { items, slotId: chosenSlot.slotId, deliveryDate: chosenSlot.deliveryDate };
      const { orderNumber } = await callApi('/api/orders', { method: 'POST', body });
      clearCart();
      navigate(`/orders/${orderNumber}`, { replace: true, state: { justPlaced: true } });
    } catch (error) {
      setState({ placing: false, error: error.message });
      if (error.status === 409) {
        slotsRequest.reload();
        quote.reload();
      }
    }
  }
  return { ...state, placeOrder };
}

export function CartPage() {
  const { account } = useAuthentication();
  const { items } = useCart();
  const quote = useCartQuote(items);
  const slotsRequest = useApiData(items.length > 0 && account.profile ? '/api/checkout/slots' : null);
  const [chosenSlot, setChosenSlotKey] = useChosenSlot(slotsRequest);
  const placing = usePlaceOrder({ items, chosenSlot, quote, slotsRequest });
  useRemoveVanishedItems(quote.cart);

  if (!account.profile) return <Navigate to="/address" replace />;
  if (items.length === 0) return <EmptyCart />;
  const { cart } = quote;
  const canPlace = cart && !cart.hasProblems && cart.meetsMinimum && chosenSlot && !quote.loading && !placing.placing;

  return (
    <main className="app-shell">
      <PageBar title="Cart" />
      <div className="page-body">
        <DeliveryAddressCard profile={account.profile} />
        {!cart && <LoadingOrError loading={quote.loading} error={quote.error} onRetry={quote.reload} />}
        {cart && <CartLines lines={cart.lines} />}
        <SlotPicker slotsRequest={slotsRequest} chosenSlot={chosenSlot} onChoose={setChosenSlotKey} />
        {cart && <BillSummary cart={cart} />}
        {placing.error && <p className="error-text" role="alert">{placing.error}</p>}
      </div>
      <div className="bottom-action">
        <button type="button" className="button button-large" disabled={!canPlace} onClick={placing.placeOrder}>
          {placing.placing ? 'Placing your order…' : `Place order${cart ? ` · ${formatRupees(cart.total)}` : ''}`}
        </button>
      </div>
    </main>
  );
}
