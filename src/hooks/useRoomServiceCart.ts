/**
 * Room Service cart state management.
 * Uses sessionStorage for persistence across page navigations.
 * Supports modifiers and per-item notes.
 */

import { useState, useMemo, useCallback } from 'react';
import type { RoomServiceMenuItem, RoomServiceModifierOption } from './useRoomServiceMenu';

export interface CartItemModifier {
  id: string;
  name: string;
  price_delta: number;
}

export interface CartItem {
  menuItem: RoomServiceMenuItem;
  quantity: number;
  notes?: string;
  modifiers: CartItemModifier[];
  /** Unique key per item+modifier combination */
  cartKey: string;
}

const CART_KEY = 'rs_cart_v2';

function generateCartKey(itemId: string, modifiers: CartItemModifier[]): string {
  const modKey = modifiers
    .map(m => m.id)
    .sort()
    .join(',');
  return `${itemId}::${modKey}`;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function clearRoomServiceCart() {
  localStorage.removeItem(CART_KEY);
  // Also clear legacy cart
  localStorage.removeItem('rs_cart');
  sessionStorage.removeItem('rs_cart');
  sessionStorage.removeItem(CART_KEY);
}

export function useRoomServiceCart() {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  const updateCart = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setCart(prev => {
      const next = updater(prev);
      persistCart(next);
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (
      menuItem: RoomServiceMenuItem,
      quantity: number,
      modifiers: CartItemModifier[] = [],
      notes?: string,
    ) => {
      const cartKey = generateCartKey(menuItem.id, modifiers);
      updateCart(prev => {
        const existing = prev.find(c => c.cartKey === cartKey);
        if (existing) {
          return prev.map(c =>
            c.cartKey === cartKey
              ? { ...c, quantity: c.quantity + quantity, notes: notes ?? c.notes }
              : c,
          );
        }
        return [...prev, { menuItem, quantity, modifiers, notes, cartKey }];
      });
    },
    [updateCart],
  );

  const updateQuantity = useCallback(
    (cartKey: string, delta: number) => {
      updateCart(prev => {
        return prev
          .map(c => {
            if (c.cartKey !== cartKey) return c;
            const newQty = c.quantity + delta;
            return newQty <= 0 ? null : { ...c, quantity: newQty };
          })
          .filter(Boolean) as CartItem[];
      });
    },
    [updateCart],
  );

  const removeFromCart = useCallback(
    (cartKey: string) => {
      updateCart(prev => prev.filter(c => c.cartKey !== cartKey));
    },
    [updateCart],
  );

  const clearCart = useCallback(() => {
    updateCart(() => []);
    clearRoomServiceCart();
  }, [updateCart]);

  const itemCount = useMemo(() => cart.reduce((s, c) => s + c.quantity, 0), [cart]);

  const subtotal = useMemo(
    () =>
      cart.reduce((s, c) => {
        const modExtra = c.modifiers.reduce((ms, m) => ms + m.price_delta, 0);
        return s + (c.menuItem.price + modExtra) * c.quantity;
      }, 0),
    [cart],
  );

  const getItemTotalQty = useCallback(
    (itemId: string) => cart.filter(c => c.menuItem.id === itemId).reduce((s, c) => s + c.quantity, 0),
    [cart],
  );

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    itemCount,
    subtotal,
    getItemTotalQty,
  };
}
