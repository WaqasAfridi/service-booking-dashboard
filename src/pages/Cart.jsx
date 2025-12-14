// src/pages/Cart.jsx
import { useBooking } from "../context/BookingContext";
import { FaTrash, FaArrowRight } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import format from "../utils/format";

/**
 * Cart page — professional & HCI-focused
 *
 * UX improvements:
 *  - Accessible checkout modal (keyboard, ESC, focus)
 *  - Prevent checkout when items invalid or edits unsaved
 *  - Clear inline validation and helpful messages
 *  - Focus management after remove/undo
 *  - Sticky summary on large screens
 *  - aria-live announcements for screen readers
 */

const DEFAULT_TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const Cart = () => {
  const {
    cart,
    removeFromCart,
    confirmBooking,
    updateCartItem,
    getSubtotal,
  } = useBooking();

  const navigate = useNavigate();

  // Local edit buffer: { [tempId]: { bookingDate, bookingTime } }
  const [localEdits, setLocalEdits] = useState(() =>
    (cart || []).reduce((acc, item) => {
      acc[item.tempId] = { bookingDate: item.bookingDate, bookingTime: item.bookingTime };
      return acc;
    }, {})
  );

  // Save state per item to show spinner briefly
  const [savingIds, setSavingIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Refs
  const firstRemoveBtnRef = useRef(null);
  const dateInputRefs = useRef({}); // map tempId -> input ref
  const announcementRef = useRef(null);

  // Ensure localEdits sync with cart changes (add missing keys without overwriting)
  useEffect(() => {
    if (!cart) return;
    setLocalEdits((prev) => {
      let next = { ...prev };
      let changed = false;

      cart.forEach((item) => {
        if (!next[item.tempId]) {
          next[item.tempId] = { bookingDate: item.bookingDate, bookingTime: item.bookingTime };
          changed = true;
        }
      });

      // remove keys that no longer exist
      Object.keys(next).forEach((k) => {
        if (!cart.some((c) => c.tempId === k)) {
          delete next[k];
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [cart]);

  // helpers
  const todayIso = () => new Date().toISOString().slice(0, 10);

  const isDateInvalid = useCallback((date) => {
    if (!date) return true;
    try {
      return format.isPast(date);
    } catch {
      // fallback: invalid if date < today
      return new Date(date) < new Date(todayIso());
    }
  }, []);

  // has invalid items according to applied values (cart) — this prevents checkout
  const hasInvalidApplied = useMemo(() => {
    if (!cart || cart.length === 0) return false;
    return cart.some((it) => {
      if (!it.bookingDate || !it.bookingTime) return true;
      return isDateInvalid(it.bookingDate);
    });
  }, [cart, isDateInvalid]);

  // detects if there are unsaved edits (localEdits differ from cart)
  const hasPendingEdits = useMemo(() => {
    if (!cart) return false;
    return cart.some((it) => {
      const e = localEdits[it.tempId];
      if (!e) return false;
      return e.bookingDate !== it.bookingDate || e.bookingTime !== it.bookingTime;
    });
  }, [cart, localEdits]);

  // subtotal
  const subtotal = useMemo(() => getSubtotal(), [cart, getSubtotal]);
  const serviceFee = Math.round(subtotal * 0.05);
  const total = Math.round(subtotal + serviceFee);

  // announce helper
  const announce = (msg) => {
    try {
      if (announcementRef.current) announcementRef.current.textContent = msg;
    } catch {
      /* ignore */
    }
  };

  // Field change handler
  const handleFieldChange = (tempId, field, value) => {
    setLocalEdits((prev) => ({ ...prev, [tempId]: { ...prev[tempId], [field]: value } }));
  };

  // Save changes for one item
  const handleApplyEdit = async (tempId) => {
    const edit = localEdits[tempId];
    if (!edit) return;
    if (!edit.bookingDate || !edit.bookingTime) {
      toast.error("Please select both date and time.");
      announce("Please select both date and time.");
      // focus the missing field
      if (!edit.bookingDate && dateInputRefs.current[tempId]) dateInputRefs.current[tempId].focus();
      return;
    }
    if (isDateInvalid(edit.bookingDate)) {
      toast.error("Please select today or a future date.");
      announce("Please select today or a future date.");
      if (dateInputRefs.current[tempId]) dateInputRefs.current[tempId].focus();
      return;
    }

    // show brief saving state for UI feedback
    setSavingIds((s) => new Set([...s, tempId]));
    const ok = updateCartItem(tempId, { bookingDate: edit.bookingDate, bookingTime: edit.bookingTime });
    // small delay to let user perceive change
    await new Promise((r) => setTimeout(r, 250));
    setSavingIds((s) => {
      const copy = new Set(s);
      copy.delete(tempId);
      return copy;
    });

    if (ok) {
      toast.success("Booking updated");
      announce("Booking updated");
    }
  };

  // Cancel in-progress edits -> restore values
  const handleCancelEdit = (tempId, originalBookingDate, originalBookingTime) => {
    setLocalEdits((prev) => ({ ...prev, [tempId]: { bookingDate: originalBookingDate, bookingTime: originalBookingTime } }));
  };

  // Remove item with focus management
  const handleRemove = (tempId, idx) => {
    const removed = removeFromCart(tempId); // context displays undo toast

    // focus management: after a small delay focus next remove button
    setTimeout(() => {
      const buttons = document.querySelectorAll("[data-remove-btn]");
      if (buttons && buttons.length) {
        const next = buttons[Math.max(0, Math.min(idx, buttons.length - 1))];
        if (next) next.focus();
      } else if (firstRemoveBtnRef.current) {
        firstRemoveBtnRef.current.focus();
      }
    }, 120);

    if (removed) {
      announce(`Removed ${removed.title} from cart`);
    }
  };

  // Scroll & focus first invalid or pending item before checkout
  const focusFirstProblem = () => {
    // prefer applied invalid (cart) first
    for (const it of cart) {
      if (!it.bookingDate || !it.bookingTime || isDateInvalid(it.bookingDate)) {
        // focus date input if present
        const ref = dateInputRefs.current[it.tempId];
        if (ref) {
          ref.focus();
          ref.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }

    // then unsaved edits
    for (const it of cart) {
      const e = localEdits[it.tempId];
      if (!e) continue;
      if (e.bookingDate !== it.bookingDate || e.bookingTime !== it.bookingTime) {
        // focus save button for that item
        const btn = document.querySelector(`[data-save-for="${it.tempId}"]`);
        if (btn) {
          btn.focus();
          btn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }
    }
  };

  // Checkout flow: open modal
  const handleCheckout = () => {
    if (!cart || cart.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (hasInvalidApplied) {
      toast.error("Please fix any missing or past dates before checking out.");
      focusFirstProblem();
      return;
    }
    if (hasPendingEdits) {
      toast.error("Please save or cancel your edits before checking out.");
      focusFirstProblem();
      return;
    }
    setCheckoutOpen(true);
  };

  // Confirm checkout in modal
  const confirmCheckout = async () => {
    setIsProcessing(true);
    try {
      await confirmBooking({ simulateDelay: true });
      setIsProcessing(false);
      toast.success("Checkout successful!");
      announce("Checkout successful");
      setCheckoutOpen(false);
      navigate("/success");
    } catch (err) {
      console.error("Checkout failed", err);
      setIsProcessing(false);
      toast.error("Checkout failed. Please try again.");
      announce("Checkout failed");
    }
  };

  // If cart empties, reset local edits map
  useEffect(() => {
    if (!cart || cart.length === 0) {
      setLocalEdits({});
    }
  }, [cart]);

  // Render empty
  if (!cart || cart.length === 0)
    return (
      <div className="min-h-[60vh] bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-black text-gray-600 dark:text-gray-400 mb-4">Your Cart is Empty</h2>
        <button
          onClick={() => navigate("/")}
          className="text-orange-500 dark:text-orange-400 font-black hover:underline text-lg focus:outline-none focus:ring-2 focus:ring-orange-400 rounded"
        >
          Browse Services
        </button>
      </div>
    );

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen py-10">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Your Cart</h1>

        {/* aria-live for screen reader announcements */}
        <div className="sr-only" aria-live="polite" ref={announcementRef} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, idx) => {
              const edit = localEdits[item.tempId] || { bookingDate: item.bookingDate, bookingTime: item.bookingTime };
              const dateInvalid = !edit.bookingDate || isDateInvalid(edit.bookingDate);
              const pending = edit.bookingDate !== item.bookingDate || edit.bookingTime !== item.bookingTime;
              const saving = savingIds.has(item.tempId);

              // ensure ref exists
              if (!dateInputRefs.current[item.tempId]) dateInputRefs.current[item.tempId] = null;

              return (
                <div
                  key={item.tempId}
                  className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-black/30 flex flex-col md:flex-row gap-4 items-start border-2 border-gray-300 dark:border-gray-800"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full md:w-24 h-44 md:h-24 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-700 flex-shrink-0"
                  />

                  <div className="flex-1 w-full">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-black text-gray-900 dark:text-white">{item.title}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">{item.provider}</div>

                        <div className="flex gap-2 mt-2 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                          <span aria-hidden>📅</span>
                          <span>
                            {format.formatDate(item.bookingDate, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span>·</span>
                          <span aria-hidden>⏰</span>
                          <span>{item.bookingTime}</span>
                          {pending && <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-300 font-black">Unsaved</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900 dark:text-white mb-2">{format.formatCurrency(item.price)}</p>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            data-remove-btn
                            ref={idx === 0 ? firstRemoveBtnRef : null}
                            onClick={() => handleRemove(item.tempId, idx)}
                            className="text-red-700 dark:text-red-400 text-sm hover:underline flex items-center gap-1 font-black focus:outline-none focus:ring-2 focus:ring-red-400 rounded px-2 py-1"
                            aria-label={`Remove ${item.title} from cart`}
                          >
                            <FaTrash /> Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline edit controls */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label htmlFor={`date-${item.tempId}`} className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Date
                        </label>
                        <input
                          id={`date-${item.tempId}`}
                          ref={(el) => (dateInputRefs.current[item.tempId] = el)}
                          type="date"
                          value={edit.bookingDate}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => handleFieldChange(item.tempId, "bookingDate", e.target.value)}
                          className={`w-full p-2 rounded-md border-2 focus:outline-none focus:ring-2 ${dateInvalid ? "border-red-300 dark:border-red-600" : "border-gray-200 dark:border-gray-700"} bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                          aria-invalid={dateInvalid}
                          aria-describedby={dateInvalid ? `err-${item.tempId}` : undefined}
                        />
                        {dateInvalid && (
                          <div id={`err-${item.tempId}`} className="text-xs text-red-600 mt-1">Date is missing or in the past</div>
                        )}
                      </div>

                      <div>
                        <label htmlFor={`time-${item.tempId}`} className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Time
                        </label>
                        <select
                          id={`time-${item.tempId}`}
                          value={edit.bookingTime}
                          onChange={(e) => handleFieldChange(item.tempId, "bookingTime", e.target.value)}
                          className="w-full p-2 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                        >
                          <option value="">Select a time</option>
                          {DEFAULT_TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 md:justify-end">
                        <button
                          data-save-for={item.tempId}
                          onClick={() => handleApplyEdit(item.tempId)}
                          disabled={saving}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 inline-flex items-center gap-2"
                          aria-label={`Apply edits for ${item.title}`}
                        >
                          {saving ? <LoadingSpinner size="sm" /> : "Save"}
                        </button>

                        <button
                          onClick={() => handleCancelEdit(item.tempId, item.bookingDate, item.bookingTime)}
                          className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md font-bold focus:outline-none focus:ring-2 focus:ring-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: order summary (sticky on large screens) */}
          <aside className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/30 h-fit border-2 border-gray-300 dark:border-gray-800 lg:sticky lg:top-6">
            <h3 className="font-black text-lg mb-4 text-gray-900 dark:text-white">Summary</h3>

            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">Items: <span className="font-semibold">{cart.length}</span></div>

            <div className="flex justify-between mb-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">Subtotal</span>
              <span className="font-black">{format.formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between mb-3 text-xs text-gray-500 dark:text-gray-400">
              <span>Service Fee (5%)</span>
              <span>{format.formatCurrency(serviceFee)}</span>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-4">
              <div className="flex justify-between mb-4">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total</span>
                <span className="font-black text-lg">{format.formatCurrency(total)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing || hasInvalidApplied || hasPendingEdits}
                aria-disabled={isProcessing || hasInvalidApplied || hasPendingEdits}
                className="w-full bg-orange-500 text-white font-black py-3 rounded-lg hover:bg-orange-600 transition-all flex justify-center items-center gap-2 shadow-md disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" /> Processing...
                  </>
                ) : (
                  <>
                    Proceed to Checkout <FaArrowRight />
                  </>
                )}
              </button>

              {/* contextual help messages */}
              {hasInvalidApplied && (
                <div className="mt-3 text-sm text-red-600">Fix missing or past dates before proceeding to checkout.</div>
              )}
              {!hasInvalidApplied && hasPendingEdits && (
                <div className="mt-3 text-sm text-yellow-600">You have unsaved edits — save or cancel them before checkout.</div>
              )}
            </div>
          </aside>
        </div>

        {/* Checkout Modal */}
        {checkoutOpen && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setCheckoutOpen(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-3xl w-full p-6 z-10">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Confirm Booking</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">You're about to confirm {cart.length} booking(s). Review and confirm.</p>

              <div className="max-h-64 overflow-auto divide-y divide-gray-100 dark:divide-gray-800 mb-4">
                {cart.map((it) => (
                  <div key={it.tempId} className="py-3 flex items-start gap-3">
                    <img src={it.image} alt={it.title} className="w-14 h-14 rounded-md object-cover border" />
                    <div className="flex-1">
                      <div className="font-black text-gray-900 dark:text-white">{it.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">{format.formatDate(it.bookingDate)} · {it.bookingTime}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">Price: <span className="font-black">{format.formatCurrency(it.price)}</span></div>
                    </div>
                    <div className="text-right font-black">{format.formatCurrency(it.price)}</div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">Total (incl. fees)</div>
                <div className="text-lg font-black">{format.formatCurrency(total)}</div>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setCheckoutOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800">Back</button>
                <button onClick={confirmCheckout} className="px-4 py-2 rounded-md bg-orange-500 text-white font-black" disabled={isProcessing}>
                  {isProcessing ? <> <LoadingSpinner size="sm" /> Processing...</> : "Confirm & Pay"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
