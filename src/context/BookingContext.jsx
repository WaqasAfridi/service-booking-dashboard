// src/context/BookingContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

/**
 * BookingContext (v2)
 *
 * Key improvements:
 *  - Versioned localStorage schema with migration support
 *  - Debounced, atomic saves and graceful fallback when localStorage fails
 *  - Centralized validation + normalized cart items
 *  - Undo support for removals (via toast)
 *  - Cross-tab sync (storage event)
 *  - Small pub/sub to allow external listeners (optional)
 *
 * Public API (not exhaustive):
 *  - cart, bookings (arrays)
 *  - cartCount, getSubtotal()
 *  - addToCart(service, date, time, notes) => tempId | null
 *  - removeFromCart(tempId) => removedItem | null (shows undo)
 *  - updateCartItem(tempId, updates) => boolean
 *  - hasInCart(serviceId, date?, time?) => boolean
 *  - confirmBooking({simulateDelay, metadata, clearCart}) => newBookings | Promise
 *  - subscribe(fn) / unsubscribe(fn)
 *
 * LocalStorage keys and schema:
 *  - CART: { v: 1, items: [ ...cartItem ] }
 *  - BOOKINGS: { v: 1, items: [ ...booking ] }
 *
 * Cart item minimal shape (normalized):
 *  {
 *    tempId: 'cart_xxx',
 *    id: service.id,
 *    title, provider, providerAvatar, category, price, rating, reviews, image, deliveryTime,
 *    bookingDate: 'YYYY-MM-DD',
 *    bookingTime: '10:00 AM',
 *    bookingNotes: '',
 *    addedAt: ISO,
 *    updatedAt?: ISO
 *  }
 */

const BookingContext = createContext(null);

const LS_KEYS = {
  CART: "apexCart_v1",
  BOOKINGS: "apexBookings_v1",
};

const LS_SCHEMA_VERSION = 1;

/* ---------- Utilities ---------- */

const hasLocalStorage = () => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

const safeParse = (raw, fallback = null) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
};

const nowISO = () => new Date().toISOString();

const generateId = (prefix = "") => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return prefix + crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${prefix}${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`;
};

/**
 * Normalize service payload to minimal shape we persist.
 */
const normalizeService = (service = {}) => {
  if (!service || typeof service !== "object") return {};
  const {
    id,
    title,
    provider,
    providerAvatar,
    category,
    price,
    rating,
    reviews,
    image,
    deliveryTime,
  } = service;
  return {
    id,
    title,
    provider,
    providerAvatar,
    category,
    price: Number(price || 0),
    rating,
    reviews,
    image,
    deliveryTime,
  };
};

/* ---------- Storage helpers (versioned) ---------- */

const wrapForSave = (items) => ({ v: LS_SCHEMA_VERSION, items: items || [] });

const unwrapLoaded = (parsed) => {
  // Support legacy array (older versions) or the new object shape
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
  return [];
};

const readFromLS = (key) => {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = safeParse(raw, null);
    return unwrapLoaded(parsed);
  } catch (err) {
    console.error("readFromLS failed", err);
    return [];
  }
};

const writeToLS = (key, items) => {
  if (!hasLocalStorage()) return false;
  try {
    const payload = wrapForSave(items);
    const raw = safeStringify(payload);
    if (raw === null) return false;
    window.localStorage.setItem(key, raw);
    return true;
  } catch (err) {
    console.error("writeToLS failed", err);
    return false;
  }
};

/* ---------- Initial load ---------- */

const initArrayFromLS = (key) => readFromLS(key);

/* ---------- Provider ---------- */

export const BookingProvider = ({ children }) => {
  // in-memory fallback if LS not available or fails
  const inMemoryRef = useRef({ cart: null, bookings: null });

  const [cart, setCart] = useState(() => {
    const loaded = initArrayFromLS(LS_KEYS.CART);
    if (loaded && loaded.length > 0) return loaded;
    // fallback to prior in-memory if present
    return inMemoryRef.current.cart || [];
  });

  const [bookings, setBookings] = useState(() => {
    const loaded = initArrayFromLS(LS_KEYS.BOOKINGS);
    if (loaded && loaded.length > 0) return loaded;
    return inMemoryRef.current.bookings || [];
  });

  // debounced save timers
  const saveTimerRef = useRef({ cart: null, bookings: null });

  // simple pub/sub for listeners (optional)
  const listenersRef = useRef(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((fn) => {
      try {
        fn({ cart, bookings });
      } catch {
        // ignore listener errors
      }
    });
  }, [cart, bookings]);

  /* ---------- Persistence (debounced) ---------- */

  const scheduleSave = useCallback((key, items) => {
    // clear previous
    if (saveTimerRef.current[key]) {
      clearTimeout(saveTimerRef.current[key]);
    }

    // schedule a short debounce to avoid frequent writes
    saveTimerRef.current[key] = setTimeout(() => {
      const ok = writeToLS(key === "cart" ? LS_KEYS.CART : LS_KEYS.BOOKINGS, items);
      if (!ok) {
        // fallback to in-memory and inform the user
        if (key === "cart") inMemoryRef.current.cart = items;
        else inMemoryRef.current.bookings = items;
        toast.error("Unable to persist data to localStorage. Using temporary storage.");
      }
      saveTimerRef.current[key] = null;
    }, 220);
  }, []);

  // persist cart when it changes
  useEffect(() => {
    scheduleSave("cart", cart);
    notify();
  }, [cart, scheduleSave, notify]);

  // persist bookings when it changes
  useEffect(() => {
    scheduleSave("bookings", bookings);
    notify();
  }, [bookings, scheduleSave, notify]);

  /* ---------- cross-tab sync ---------- */

  useEffect(() => {
    if (!hasLocalStorage()) return undefined;
    const onStorage = (e) => {
      if (!e.key) return;
      try {
        if (e.key === LS_KEYS.CART) {
          const next = unwrapLoaded(safeParse(e.newValue, null));
          // Replace entire cart (simple strategy)
          setCart(next);
        } else if (e.key === LS_KEYS.BOOKINGS) {
          const next = unwrapLoaded(safeParse(e.newValue, null));
          setBookings(next);
        }
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- Derived helpers ---------- */

  const cartCount = useMemo(() => cart.length, [cart]);

  const getSubtotal = useCallback(
    (items = cart) => items.reduce((acc, it) => acc + (Number(it.price) || 0), 0),
    [cart]
  );

  const startOfDay = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  };

  const isValidDate = useCallback((dateStr) => {
    try {
      if (!dateStr) return false;
      // Accept YYYY-MM-DD or ISO
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return false;
      // ensure not in past (compare by day)
      return startOfDay(d) >= startOfDay(new Date());
    } catch {
      return false;
    }
  }, []);

  const hasInCart = useCallback(
    (serviceId, date = null, time = null) =>
      cart.some(
        (it) =>
          Number(it.id) === Number(serviceId) &&
          (date ? it.bookingDate === date : true) &&
          (time ? it.bookingTime === time : true)
      ),
    [cart]
  );

  const getCartItem = useCallback((tempId) => cart.find((it) => it.tempId === tempId) || null, [cart]);

  /* ---------- Cart operations ---------- */

  /**
   * addToCart(service, date, time, notes)
   * - returns tempId on success, null on failure
   */
  const addToCart = useCallback(
    (service, date, time, notes = "") => {
      if (!service || service.id === undefined || service.id === null) {
        toast.error("Invalid service selected.");
        return null;
      }
      if (!date || !time) {
        toast.error("Please select date and time.");
        return null;
      }
      if (!isValidDate(date)) {
        toast.error("Please select today or a future date.");
        return null;
      }

      const normalized = normalizeService(service);

      // prevent duplicates
      if (hasInCart(normalized.id, date, time)) {
        toast("This booking is already in your cart.", { icon: "ℹ️" });
        return null;
      }

      const tempId = generateId("cart_");
      const item = {
        ...normalized,
        bookingDate: date,
        bookingTime: time,
        bookingNotes: String(notes || ""),
        tempId,
        addedAt: nowISO(),
      };

      setCart((prev) => {
        const next = [...prev, item];
        // optimistic toast
        toast.success("Added to cart", { duration: 2200 });
        return next;
      });

      return tempId;
    },
    [hasInCart, isValidDate]
  );

  /**
   * removeFromCart(tempId)
   * - removes item immediately but offers Undo via toast
   * - returns removed item or null
   */
  const removeFromCart = useCallback(
    (tempId, { undoTimeout = 4000 } = {}) => {
      let removed = null;
      setCart((prev) => {
        const idx = prev.findIndex((p) => p.tempId === tempId);
        if (idx === -1) return prev;
        removed = prev[idx];
        const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        return next;
      });

      if (!removed) {
        toast.error("Item not found.");
        return null;
      }

      // provide undo affordance
      const toastId = toast((t) => (
        <div className="flex items-center gap-3">
          <span>Removed from cart</span>
          <button
            onClick={() => {
              setCart((prev) => {
                // avoid duplicates
                if (prev.some((i) => i.tempId === removed.tempId)) return prev;
                return [...prev, removed];
              });
              toast.dismiss(t.id);
              toast.success("Restored item");
            }}
            className="ml-2 font-bold underline"
          >
            Undo
          </button>
        </div>
      ), { duration: undoTimeout });

      return removed;
    },
    []
  );

  /**
   * updateCartItem(tempId, updates)
   * - updates bookingDate, bookingTime, bookingNotes
   * - returns true on success
   */
  const updateCartItem = useCallback(
    (tempId, updates = {}) => {
      const { bookingDate, bookingTime, bookingNotes } = updates;
      if (bookingDate && !isValidDate(bookingDate)) {
        toast.error("Please select today or a future date.");
        return false;
      }

      let found = false;
      setCart((prev) =>
        prev.map((it) => {
          if (it.tempId !== tempId) return it;
          found = true;
          return {
            ...it,
            ...(bookingDate ? { bookingDate } : {}),
            ...(bookingTime ? { bookingTime } : {}),
            ...(bookingNotes !== undefined ? { bookingNotes: String(bookingNotes) } : {}),
            updatedAt: nowISO(),
          };
        })
      );

      if (!found) {
        toast.error("Cart item not found.");
        return false;
      }

      toast.success("Cart updated", { duration: 1400 });
      return true;
    },
    [isValidDate]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    toast("Cart cleared", { icon: "🗑️" });
  }, []);

  /* ---------- Booking operations ---------- */

  /**
   * confirmBooking({simulateDelay, metadata, clearCart})
   * - moves all cart items to bookings with consistent metadata
   * - returns newBookings or Promise resolving to newBookings
   */
  const confirmBooking = useCallback(
    ({ simulateDelay = false, metadata = {}, clearCart: doClear = true } = {}) => {
      if (!cart || cart.length === 0) {
        toast.error("Your cart is empty.");
        return null;
      }

      // validate every cart item before confirming
      for (const it of cart) {
        if (!it.bookingDate || !it.bookingTime) {
          toast.error("Please ensure all cart items have a valid date and time.");
          return null;
        }
        if (!isValidDate(it.bookingDate)) {
          toast.error("One or more bookings have invalid dates.");
          return null;
        }
      }

      const batchOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const newBookings = cart.map((item) => ({
        bookingId: generateId("bk_"),
        orderId: `${batchOrderId}-${Math.floor(Math.random() * 90000 + 10000)}`,
        createdAt: nowISO(),
        status: "confirmed",
        ...item,
        metadata: metadata || {},
      }));

      const doCommit = () => {
        setBookings((prev) => {
          const merged = [...prev, ...newBookings];
          return merged;
        });
        if (doClear) setCart([]);
        toast.success("Bookings confirmed! 🎉", { duration: 2600 });
        return newBookings;
      };

      if (simulateDelay) {
        return new Promise((resolve) => {
          setTimeout(() => resolve(doCommit()), 900);
        });
      }

      return doCommit();
    },
    [cart, isValidDate]
  );

  const clearBookings = useCallback(() => {
    setBookings([]);
    toast("All bookings cleared");
  }, []);

  const removeBooking = useCallback((bookingId) => {
    let removed = null;
    setBookings((prev) => {
      const idx = prev.findIndex((b) => b.bookingId === bookingId);
      if (idx === -1) return prev;
      removed = prev[idx];
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return next;
    });
    if (removed) {
      toast.success("Booking removed");
      return removed;
    } else {
      toast.error("Booking not found");
      return null;
    }
  }, []);

  const updateBooking = useCallback((bookingId, updates = {}) => {
    let found = false;
    setBookings((prev) =>
      prev.map((b) => {
        if (b.bookingId !== bookingId) return b;
        found = true;
        return { ...b, ...updates, updatedAt: nowISO() };
      })
    );
    if (!found) {
      toast.error("Booking not found");
      return false;
    }
    toast.success("Booking updated");
    return true;
  }, []);

  /* ---------- subscriptions (optional) ---------- */

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    // return unsubscribe
    return () => listenersRef.current.delete(fn);
  }, []);

  const unsubscribe = useCallback((fn) => {
    listenersRef.current.delete(fn);
  }, []);

  /* ---------- exposed API ---------- */

  const value = useMemo(
    () => ({
      // state
      cart,
      bookings,

      // derived
      cartCount,
      getSubtotal,

      // cart actions
      addToCart,
      removeFromCart,
      updateCartItem,
      clearCart,
      hasInCart,
      getCartItem,

      // booking actions
      confirmBooking,
      clearBookings,
      removeBooking,
      updateBooking,

      // subscriptions (advanced)
      subscribe,
      unsubscribe,

      // debugging
      _lsKeys: LS_KEYS,
    }),
    [
      cart,
      bookings,
      cartCount,
      getSubtotal,
      addToCart,
      removeFromCart,
      updateCartItem,
      clearCart,
      hasInCart,
      getCartItem,
      confirmBooking,
      clearBookings,
      removeBooking,
      updateBooking,
      subscribe,
      unsubscribe,
    ]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
};

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
};
