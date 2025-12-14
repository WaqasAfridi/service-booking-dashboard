// src/components/ServiceCard.jsx
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import {
  FaStar,
  FaHeart,
  FaRegHeart,
  FaCalendarAlt,
  FaClock,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";
import format from "../utils/format";
import { useBooking } from "../context/BookingContext";
import toast from "react-hot-toast";

/**
 * ServiceCard — HCI/UX update
 * - Quick Book popover rendered via portal to avoid clipping
 * - Smart positioning to keep the popover visible in viewport
 * - Scrollable popover with maxHeight to ensure full form access
 * - Accessible focus management and keyboard handling
 */

const DEFAULT_TIME_SLOTS = [
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const todayISO = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const ServiceCard = ({ service }) => {
  const { addToCart, hasInCart } = useBooking();

  // favorite (persisted locally)
  const [favorited, setFavorited] = useState(() => {
    try {
      const raw = localStorage.getItem(`fav-service-${service?.id}`);
      return raw === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`fav-service-${service?.id}`, favorited ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [favorited, service?.id]);

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorited((v) => !v);
    toast.success(!favorited ? "Added to favorites" : "Removed from favorites");
  };

  // Quick-book popover state
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null); // the Quick Book button
  const firstRef = useRef(null); // first input in popover
  const portalRef = useRef(null); // portal container (for outside click detection)

  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(DEFAULT_TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [announce, setAnnounce] = useState("");

  // popover positioning state
  const [pos, setPos] = useState({ top: 0, left: 0, width: 360, maxHeight: 400 });

  const inCart = hasInCart(service?.id);

  const priceLabel = format.formatCurrency(service?.price ?? 0);

  const isValidDate = (d) => {
    try {
      if (!d) return false;
      const chosen = new Date(d);
      if (Number.isNaN(chosen.getTime())) return false;
      const start = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
      return start(chosen) >= start(new Date());
    } catch {
      return false;
    }
  };

  // Compute popover position relative to anchor and viewport
  const computePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor || typeof window === "undefined") {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    const desiredWidth = Math.min(360, Math.max(280, Math.floor(vw * 0.28)));
    const spacing = 8;
    // prefer below anchor
    const belowTop = rect.bottom + spacing;
    const availableBelow = vh - belowTop - 16; // keep 16px margin
    const popMaxHeightBelow = Math.max(180, availableBelow);

    // left: try to align start with anchor.left, but keep within viewport
    let left = rect.left;
    if (left + desiredWidth > vw - 16) {
      left = Math.max(16, vw - desiredWidth - 16);
    }
    if (left < 8) left = 8;

    // top: if there is little space below, clamp height and show below; user can scroll
    let top = belowTop;
    let maxHeight = popMaxHeightBelow;

    // If below space is too small (<200), try placing above
    if (availableBelow < 220) {
      const aboveBottom = rect.top - spacing;
      const availableAbove = aboveBottom - 16;
      if (availableAbove > availableBelow) {
        // place above
        maxHeight = Math.max(180, availableAbove);
        top = Math.max(16, rect.top - spacing - Math.min(420, maxHeight));
      } else {
        // still place below but smaller
        top = belowTop;
      }
    }

    setPos({ top: Math.max(8, Math.floor(top)), left: Math.floor(left), width: desiredWidth, maxHeight: Math.floor(maxHeight) });
  };

  // recompute on open and on scroll/resize
  useLayoutEffect(() => {
    if (!open) return;
    computePosition();
    const onChange = () => computePosition();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true); // capture scroll in ancestors
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // focus management: focus first input on open
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      if (firstRef.current) firstRef.current.focus();
    }, 40);
  }, [open]);

  // click outside (portal aware)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      // if click is on anchor, ignore (toggle handled by button)
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // keyboard: Esc closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset fields when opening
  useEffect(() => {
    if (open) {
      setDate(todayISO());
      setTime(DEFAULT_TIME_SLOTS[0]);
      setNotes("");
      setAnnounce("");
    }
  }, [open]);

  const handleAddToCart = async (e) => {
    e?.preventDefault?.();
    if (!date || !time) {
      setAnnounce("Please select date and time.");
      toast.error("Please select date and time.");
      return;
    }
    if (!isValidDate(date)) {
      setAnnounce("Please select today or a future date.");
      toast.error("Please select today or a future date.");
      return;
    }
    if (hasInCart(service.id, date, time)) {
      setAnnounce("This booking is already in your cart.");
      toast("This booking is already in your cart.", { icon: "ℹ️" });
      return;
    }

    try {
      setAdding(true);
      const tempId = addToCart(service, date, time, notes);
      if (tempId) {
        setAnnounce("Added to cart.");
        toast.success("Added to cart");
        setOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not add to cart.");
    } finally {
      setAdding(false);
    }
  };

  // Portal popover element
  const PopoverPortal = () => {
    // ensure portal container exists
    if (typeof document === "undefined") return null;

    const style = {
      position: "fixed",
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      width: `${pos.width}px`,
      zIndex: 9999,
      // allow animation origin
      transition: "opacity 0.12s ease, transform 0.12s ease",
    };

    return ReactDOM.createPortal(
      <div
        ref={portalRef}
        role="dialog"
        aria-modal="false"
        id={`quick-book-${service.id}`}
        aria-label={`Quick book ${service.title}`}
        style={style}
      >
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 p-3">
          <form onSubmit={handleAddToCart} className="flex flex-col gap-3" aria-live="polite">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-600 dark:text-gray-300" />
              <label htmlFor={`qb-date-${service.id}`} className="sr-only">Date</label>
              <input
                ref={firstRef}
                id={`qb-date-${service.id}`}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayISO()}
                className="flex-1 p-2 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <FaClock className="text-gray-600 dark:text-gray-300" />
              <label htmlFor={`qb-time-${service.id}`} className="sr-only">Time</label>
              <select
                id={`qb-time-${service.id}`}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 p-2 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {DEFAULT_TIME_SLOTS.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`qb-notes-${service.id}`} className="sr-only">Notes</label>
              <textarea
                id={`qb-notes-${service.id}`}
                rows={4}
                placeholder="Optional note for the provider (requirements, links)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                style={{ maxHeight: Math.max(120, pos.maxHeight - 220), overflow: "auto" }}
              />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={adding}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-black focus:outline-none focus:ring-2",
                  adding ? "bg-orange-300 cursor-wait" : "bg-orange-500 hover:bg-orange-600 text-white"
                )}
              >
                {adding ? "Adding..." : "Add to Cart"}
              </button>
            </div>

            {/* aria-live text for screen readers */}
            <div className="sr-only" aria-live="polite">{announce}</div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <article
      className={cn(
        "group rounded-xl transition-all duration-300 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-800 shadow-sm hover:shadow-2xl focus-within:shadow-2xl",
        "focus:outline-none focus:ring-2 focus:ring-orange-400 overflow-hidden"
      )}
      aria-labelledby={`service-title-${service.id}`}
    >
      <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
        {service.featured && (
          <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-orange-500 text-white shadow">
            Featured
          </span>
        )}

        <Link to={`/service/${service.id}`} className="absolute inset-0 w-full h-full" aria-hidden tabIndex={-1}>
          <img
            src={service.image}
            alt={service.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Favorite button */}
        <button
          onClick={toggleFavorite}
          aria-pressed={favorited}
          aria-label={favorited ? "Remove favorite" : "Add to favorites"}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-white/95 dark:bg-gray-800/95 text-gray-700 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          {favorited ? <FaHeart /> : <FaRegHeart />}
        </button>

        {inCart && (
          <span className="absolute right-3 bottom-3 z-20 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow">
            In Cart
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {service.providerAvatar ? (
            <img
              src={service.providerAvatar}
              alt={`${service.provider} avatar`}
              className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
              {service.provider ? service.provider.split(" ").map((n) => n[0]).slice(0, 2).join("") : "P"}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 id={`service-title-${service.id}`} className="font-black text-gray-900 dark:text-white line-clamp-2 text-sm">
              <Link to={`/service/${service.id}`} className="hover:underline">
                {service.title}
              </Link>
            </h3>

            <div className="mt-1 text-xs text-gray-600 dark:text-gray-300 font-medium">
              by {service.provider} · <span className="font-black">{service.rating}</span>
              <span className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">{service.reviews} reviews</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-gray-300 dark:border-gray-800 pt-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="font-bold">Starting from</div>
            <div className="text-lg font-black text-gray-900 dark:text-white">{priceLabel}</div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/service/${service.id}`}
              className="px-3 py-2 rounded-md text-sm font-semibold bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              Details
            </Link>

            <button
              ref={anchorRef}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Toggle open
                setOpen((s) => !s);
              }}
              aria-expanded={open}
              aria-controls={`quick-book-${service.id}`}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-black focus:outline-none focus:ring-2",
                "bg-orange-500 hover:bg-orange-600 text-white"
              )}
            >
              Quick Book
            </button>
          </div>
        </div>

        {/* Render portal popover when open */}
        {open && <PopoverPortal />}
      </div>
    </article>
  );
};

export default ServiceCard;
