import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useCart } from '../../cart/CartContext.jsx';
import { useCartQuote } from '../../cart/useCartQuote.js';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { deliveryAddressLine, formatRupees } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { CartLines } from './CartLines.jsx';
import { SlotPicker, slotKeyOf } from './SlotPicker.jsx';
import { BillSummary } from './BillSummary.jsx';

function DeliveryAddressCard({ profile }) {
  const { closeCart } = useCart();
  return (
    <section className="card address-card">
      <span className="benefit-icon"><Icon name="pin" /></span>
      <div className="address-card-text">
        <p className="hint">Delivering to</p>
        <p className="address-card-line">{deliveryAddressLine(profile)}</p>
      </div>
      <Link to="/address" className="text-button small-text-button" onClick={closeCart}>Change</Link>
    </section>
  );
}

function CartMessage({ icon, message, linkTo, linkLabel }) {
  const { closeCart } = useCart();
  return (
    <div className="cart-panel-body centered-block cart-message">
      <span className="benefit-icon"><Icon name={icon} /></span>
      <p>{message}</p>
      <Link to={linkTo} className="button button-outline" onClick={closeCart}>{linkLabel}</Link>
    </div>
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
  const { clearCart, closeCart } = useCart();
  const navigate = useNavigate();
  const [state, setState] = useState({ placing: false, error: null });

  async function placeOrder() {
    setState({ placing: true, error: null });
    try {
      const body = { items, slotId: chosenSlot.slotId, deliveryDate: chosenSlot.deliveryDate };
      const { orderNumber } = await callApi('/api/orders', { method: 'POST', body });
      clearCart();
      closeCart();
      navigate(`/orders/${orderNumber}`, { state: { justPlaced: true } });
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

function PlaceOrderButton({ placing, cart, canPlace }) {
  return (
    <div className="cart-panel-footer">
      {placing.error && <p className="error-text" role="alert">{placing.error}</p>}
      <button type="button" className="button button-large" disabled={!canPlace} onClick={placing.placeOrder}>
        {placing.placing
          ? <><span className="spinner" aria-hidden="true" /> Placing your order…</>
          : `Place order${cart ? ` · ${formatRupees(cart.total)}` : ''}`}
      </button>
    </div>
  );
}

function CartCheckout({ profile, items }) {
  const quote = useCartQuote(items);
  const slotsRequest = useApiData('/api/checkout/slots');
  const [chosenSlot, setChosenSlotKey] = useChosenSlot(slotsRequest);
  const placing = usePlaceOrder({ items, chosenSlot, quote, slotsRequest });
  useRemoveVanishedItems(quote.cart);
  const { cart } = quote;
  const canPlace = cart && !cart.hasProblems && cart.meetsMinimum && chosenSlot && !quote.loading && !placing.placing;

  return (
    <>
      <div className="cart-panel-body">
        <DeliveryAddressCard profile={profile} />
        {!cart && <LoadingOrError loading={quote.loading} error={quote.error} onRetry={quote.reload} />}
        {cart && <CartLines lines={cart.lines} />}
        <SlotPicker slotsRequest={slotsRequest} chosenSlot={chosenSlot} onChoose={setChosenSlotKey} />
        {cart && <BillSummary cart={cart} />}
      </div>
      <PlaceOrderButton placing={placing} cart={cart} canPlace={canPlace} />
    </>
  );
}

// What the cart panel shows: the checkout, or why there is nothing to check out yet.
export function CartPanel() {
  const { account } = useAuthentication();
  const { items } = useCart();
  if (items.length === 0) return <CartMessage icon="cart" message="Your cart is empty." linkTo="/" linkLabel="Start shopping" />;
  if (!account.profile) return <CartMessage icon="pin" message="Add your delivery address first." linkTo="/address" linkLabel="Add address" />;
  return <CartCheckout profile={account.profile} items={items} />;
}
