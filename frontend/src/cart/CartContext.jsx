import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthentication } from '../AuthenticationContext.jsx';

export const maximumQuantityPerItem = 20;
const CartContext = createContext(null);

// The cart lives on this device, one per signed-in user. It holds only
// pack size ids and quantities; prices always come fresh from the server.
const storageKeyFor = (userId) => `grocery-store-cart-${userId}`;

function readSavedCart(userId) {
  if (!userId) return [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKeyFor(userId)) ?? '[]');
    return Array.isArray(saved) ? saved.filter((item) => item.packSizeId > 0 && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

function saveCart(userId, items) {
  if (!userId) return;
  try {
    localStorage.setItem(storageKeyFor(userId), JSON.stringify(items));
  } catch {
    // Private browsing or full storage: the cart still works until the page reloads.
  }
}

function withQuantity(items, packSizeId, quantity) {
  const capped = Math.min(Math.max(quantity, 0), maximumQuantityPerItem);
  const existing = items.find((item) => item.packSizeId === packSizeId);
  if (capped === (existing?.quantity ?? 0)) return items;
  if (capped === 0) return items.filter((item) => item !== existing);
  if (!existing) return [...items, { packSizeId, quantity: capped }];
  return items.map((item) => (item === existing ? { packSizeId, quantity: capped } : item));
}

const quantityIn = (items, packSizeId) => items.find((item) => item.packSizeId === packSizeId)?.quantity ?? 0;

// Reorder: each item is added on top of what is already in the cart.
function withAddedItems(items, newItems) {
  return newItems.reduce((result, item) => withQuantity(result, item.packSizeId, quantityIn(result, item.packSizeId) + item.quantity), items);
}

export function CartProvider({ children }) {
  const { session } = useAuthentication();
  const userId = session?.user?.id;
  const [cart, setCart] = useState(() => ({ userId, items: readSavedCart(userId) }));
  // Someone else signed in: switch to their saved cart.
  if (cart.userId !== userId) setCart({ userId, items: readSavedCart(userId) });
  const { items } = cart;

  useEffect(() => saveCart(cart.userId, cart.items), [cart]);

  const updateItems = useCallback((change) => {
    setCart((previous) => {
      const changed = change(previous.items);
      return changed === previous.items ? previous : { ...previous, items: changed };
    });
  }, []);
  const setQuantity = useCallback((packSizeId, quantity) => updateItems((current) => withQuantity(current, packSizeId, quantity)), [updateItems]);
  const addItems = useCallback((newItems) => updateItems((current) => withAddedItems(current, newItems)), [updateItems]);
  const clearCart = useCallback(() => updateItems(() => []), [updateItems]);

  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    quantityOf: (packSizeId) => quantityIn(items, packSizeId),
    setQuantity,
    addItems,
    clearCart,
  }), [items, setQuantity, addItems, clearCart]);
  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  return useContext(CartContext);
}
