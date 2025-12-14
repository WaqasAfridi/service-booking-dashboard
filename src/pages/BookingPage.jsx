// src/pages/BookingPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import servicesData from "../data/services.json";
import { useBooking } from "../context/BookingContext";
import LoadingSpinner from "../components/LoadingSpinner";
import { FaCalendarAlt, FaClock, FaChevronLeft } from "react-icons/fa";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";
import format from "../utils/format";

const DAYS_AHEAD = 21; // show next 21 days (today + 20)

/* Helpers */
const isoDate = (d) => {
  // create ISO YYYY-MM-DD in local timezone
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const day = `${dt.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const formatFriendly = (iso) => {
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dt);
  } catch {
    return iso;
  }
};

const BookingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    addToCart,
    hasInCart
  } = useBooking();

  // find service robustly
  const service = useMemo(
    () =>
      servicesData.services.find((s) => Number(s.id) === Number(id)) || null,
    [id]
  );

  // date: ISO string (YYYY-MM-DD)
  const today = useMemo(() => {
    const d = new Date();
    // zero time part not needed since isoDate uses date fields
    return d;
  }, []);

  const todayIso = useMemo(() => isoDate(today), [today]);

  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const headingRef = useRef(null);

  // generate next DAYS_AHEAD days (objects with iso, label, day)
  const upcomingDays = useMemo(() => {
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { iso: isoDate(d), label: formatFriendly(isoDate(d)), day: d.getDate() };
    });
  }, [today]);

  // Default time slots (could be extended to be per-service availability)
  const timeSlots = useMemo(
    () => ["10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"],
    []
  );

  useEffect(() => {
    // reset selected time when date changes (encourage explicit selection)
    setSelectedTime(null);
  }, [selectedDateIso]);

  useEffect(() => {
    // focus heading for screen reader + keyboard users
    if (headingRef.current) headingRef.current.focus();
    // set page title
    if (service) document.title = `Book — ${service.title} · Apex`;
  }, [service]);

  // Guard - service not found
  if (!service)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-800 dark:text-gray-200 font-bold">Service not found</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 inline-flex items-center gap-2 bg-orange-500 text-white font-black px-4 py-2 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <FaChevronLeft /> Back to Home
          </button>
        </div>
      </div>
    );

  /* --- handlers --- */
  const handleDateInput = (e) => {
    const val = e.target.value;
    if (!val) return;
    // prevent selecting past by comparing ISO days
    const chosen = new Date(val);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (chosen < todayStart) {
      setLiveMessage("Please select today or a future date.");
      toast.error("Please select today or a future date.");
      return;
    }
    setSelectedDateIso(val);
    setLiveMessage(`Selected ${formatFriendly(val)}`);
  };

  const handleDayButton = (iso) => {
    setSelectedDateIso(iso);
    setLiveMessage(`Selected ${formatFriendly(iso)}`);
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    setLiveMessage(`Selected ${time}`);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // validation
    if (!selectedDateIso) {
      toast.error("Please select a date.");
      setLiveMessage("Please select a date.");
      return;
    }
    if (!selectedTime) {
      toast.error("Please select a time.");
      setLiveMessage("Please select a time.");
      return;
    }

    // duplicate check (same service + date + time)
    if (hasInCart(service.id, selectedDateIso, selectedTime)) {
      toast(
        "A booking for this service at the selected date & time already exists in your cart.",
        { icon: "ℹ️" }
      );
      setLiveMessage("This booking is already in your cart.");
      return;
    }

    setIsAdding(true);
    try {
      const tempId = addToCart(service, selectedDateIso, selectedTime, notes);
      if (!tempId) {
        // addToCart emits its own toast for validation errors
        setIsAdding(false);
        return;
      }
      // small visual delay for a smooth UX
      setTimeout(() => {
        setIsAdding(false);
        toast.success("Added to cart. You can review or edit it in the Cart.");
        navigate("/cart");
      }, 500);
    } catch (err) {
      console.error("Failed to add to cart", err);
      toast.error("Something went wrong. Please try again.");
      setIsAdding(false);
    }
  };

  /* keyboard navigation for day grid: handle arrow keys to move selection */
  const dayGridRef = useRef(null);
  useEffect(() => {
    const el = dayGridRef.current;
    if (!el) return;
    const onKey = (ev) => {
      const active = document.activeElement;
      if (!el.contains(active)) return;
      if (ev.key.startsWith("Arrow")) {
        ev.preventDefault();
        // move focus by offset depending on arrow, grid has 7 columns
        const buttons = Array.from(el.querySelectorAll("button[data-day-index]"));
        const idx = Number(active.getAttribute("data-day-index"));
        let nextIdx = idx;
        if (ev.key === "ArrowLeft") nextIdx = Math.max(0, idx - 1);
        if (ev.key === "ArrowRight") nextIdx = Math.min(buttons.length - 1, idx + 1);
        if (ev.key === "ArrowUp") nextIdx = Math.max(0, idx - 7);
        if (ev.key === "ArrowDown") nextIdx = Math.min(buttons.length - 1, idx + 7);
        const next = buttons[nextIdx];
        if (next) next.focus();
      }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, []);

  /* render */
  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen py-10">
      <div className="container mx-auto px-6">
        <header className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <FaChevronLeft className="text-lg text-gray-700 dark:text-gray-200" />
          </button>
          <div>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-3xl font-black text-gray-900 dark:text-white"
            >
              Schedule Your Service
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
              {service.title}
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8" noValidate>
          {/* LEFT: Date & Time selection */}
          <section className="lg:col-span-2 space-y-6">
            {/* Date input */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg dark:shadow-2xl border-2 border-gray-300 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <FaCalendarAlt className="text-base" /> Select Date
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {formatFriendly(selectedDateIso)}
                </div>
              </div>

              <div className="flex gap-4 items-center mb-4">
                <input
                  aria-label="Select date"
                  type="date"
                  min={todayIso}
                  value={selectedDateIso}
                  onChange={handleDateInput}
                  className="p-2 rounded-md border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Choose a date or pick from the next {DAYS_AHEAD} days below.
                </div>
              </div>

              {/* Days grid (quick pick) */}
              <div
                ref={dayGridRef}
                className="grid grid-cols-7 gap-2 mt-2"
                role="grid"
                aria-label="Next days"
              >
                {upcomingDays.map((d, idx) => {
                  const selected = d.iso === selectedDateIso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      data-day-index={idx}
                      onClick={() => handleDayButton(d.iso)}
                      aria-pressed={selected}
                      className={cn(
                        "p-2 rounded-md text-xs font-semibold focus:outline-none focus:ring-2",
                        selected
                          ? "bg-orange-500 text-white shadow"
                          : "bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:border-orange-400 dark:hover:border-orange-400"
                      )}
                    >
                      <div className="leading-tight">{d.label.split(",")[0]}</div>
                      <div className="text-sm mt-1">{d.day}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time slots */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg dark:shadow-2xl border-2 border-gray-300 dark:border-gray-800">
              <h2 className="font-black text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <FaClock /> Select Time
              </h2>

              <div
                role="radiogroup"
                aria-label="Available time slots"
                className="grid grid-cols-3 md:grid-cols-4 gap-3"
              >
                {timeSlots.map((time) => {
                  const active = selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => handleTimeSelect(time)}
                      className={cn(
                        "py-3 px-4 rounded-md text-sm font-bold focus:outline-none focus:ring-2",
                        active
                          ? "bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500 text-orange-700 dark:text-orange-300"
                          : "bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 hover:border-orange-400 dark:hover:border-orange-400"
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>

              {/* Notes */}
              <div className="mt-6">
                <label
                  htmlFor="notes"
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Notes for the provider (optional)
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share key details, access instructions or preferences..."
                  className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </section>

          {/* RIGHT: Summary & Confirm */}
          <aside className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl dark:shadow-2xl border-2 border-gray-300 dark:border-gray-800 h-fit">
            <h3 className="font-black text-lg mb-4 text-gray-900 dark:text-white border-b pb-4">
              Summary
            </h3>

            <div className="flex items-start gap-4 mb-4">
              <img
                src={service.image}
                alt={service.title}
                className="w-20 h-20 rounded-md object-cover border-2 border-gray-200 dark:border-gray-800"
                loading="lazy"
              />
              <div className="flex-1">
                <div className="font-black text-gray-900 dark:text-white">
                  {service.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
                  {service.provider}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {service.deliveryTime} delivery
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Date</span>
                <span>{formatFriendly(selectedDateIso)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Time</span>
                <span>{selectedTime ?? "Not selected"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Price</span>
                <span className="font-black text-gray-900 dark:text-white">
                  {format.formatCurrency(service.price)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isAdding}
                aria-disabled={isAdding}
                className="w-full inline-flex items-center justify-center gap-3 bg-orange-500 text-white font-black py-3 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
              >
                {isAdding ? <LoadingSpinner size="sm" /> : "Confirm & Add to Cart"}
              </button>

              <button
                type="button"
                onClick={() => navigate(`/service/${service.id}`)}
                className="w-full mt-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:underline"
              >
                View Service Details
              </button>
            </div>

            {/* ARIA live region for screen reader feedback */}
            <div className="sr-only" aria-live="polite">
              {liveMessage}
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
