// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useBooking } from "../context/BookingContext";
import format from "../utils/format";
import toast from "react-hot-toast";
import {
  FaTrash,
  FaCalendarAlt,
  FaSearch,
  FaExternalLinkAlt,
  FaUser,
  FaClipboardList,
  FaDownload,
  FaEdit,
  FaTimes,
} from "react-icons/fa";

/**
 * Dashboard - improved
 * - Overview cards
 * - Search / filter / sort / pagination for bookings
 * - Accessible modals for booking details, confirm cancel, seller profile edit
 * - Posted projects management (localStorage key: apex-posted-projects)
 */

const ITEMS_PER_PAGE = 8;
const SELLER_LS_KEY = "apex-seller-profile";
const PROJECTS_LS_KEY = "apex-posted-projects";

const readJSON = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const formatDateFriendly = (iso) => {
  try {
    return format.formatDate(iso, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

const Dashboard = () => {
  const {
    bookings = [],
    removeBooking,
    updateBooking,
    getSubtotal,
  } = useBooking();

  // list controls
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | confirmed | other statuses
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | price_desc | price_asc
  const [page, setPage] = useState(1);

  // modals / focused item
  const [viewing, setViewing] = useState(null); // booking object
  const [confirmCancelFor, setConfirmCancelFor] = useState(null);

  // seller profile + projects
  const [sellerProfile, setSellerProfile] = useState(() => readJSON(SELLER_LS_KEY, null));
  const [projects, setProjects] = useState(() => readJSON(PROJECTS_LS_KEY, []));
  const [editingSeller, setEditingSeller] = useState(false);
  const [editingSellerDraft, setEditingSellerDraft] = useState({ shopName: "", bio: "", categories: [] });

  // live region for announcements
  const liveRef = useRef(null);

  useEffect(() => {
    // keep local copies in sync from LS when changed externally
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key === SELLER_LS_KEY) setSellerProfile(readJSON(SELLER_LS_KEY, null));
      if (e.key === PROJECTS_LS_KEY) setProjects(readJSON(PROJECTS_LS_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Derived metrics
  const totalBookings = bookings.length;
  const upcomingBookings = bookings.filter((b) => {
    try {
      return new Date(b.bookingDate) >= new Date(new Date().toISOString().slice(0, 10));
    } catch {
      return false;
    }
  }).length;
  const revenue = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

  // Filtered & sorted results
  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    let out = bookings.filter((b) => {
      if (statusFilter !== "all" && (b.status || "confirmed") !== statusFilter) return false;
      if (!q) return true;
      // search in title, provider, orderId
      const inTitle = (b.title || "").toLowerCase().includes(q);
      const inProvider = (b.provider || "").toLowerCase().includes(q);
      const inOrder = (b.orderId || "").toLowerCase().includes(q);
      return inTitle || inProvider || inOrder;
    });

    if (sortBy === "date_asc") out = out.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
    else if (sortBy === "date_desc") out = out.sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate));
    else if (sortBy === "price_asc") out = out.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else if (sortBy === "price_desc") out = out.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));

    return out;
  }, [bookings, query, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => {
    if (page > totalPages) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const visible = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* ---------- booking actions ---------- */

  const handleView = (booking) => {
    setViewing(booking);
  };

  const handleConfirmCancel = (booking) => {
    setConfirmCancelFor(booking);
  };

  const performCancel = (bookingId) => {
    // We will just remove booking here; BookingContext has removeBooking and shows toast
    const removed = removeBooking(bookingId);
    if (removed) {
      setConfirmCancelFor(null);
      setViewing(null);
      setTimeout(() => {
        liveRef.current && (liveRef.current.textContent = `Booking for ${removed.title} cancelled`);
      }, 100);
    }
  };

  /* ---------- seller profile ---------- */

  const startEditSeller = () => {
    setEditingSellerDraft(
      sellerProfile || { shopName: "", bio: "", categories: [] }
    );
    setEditingSeller(true);
  };

  const saveSellerProfile = () => {
    // simple validation
    if (!editingSellerDraft.shopName || editingSellerDraft.shopName.trim().length < 2) {
      toast.error("Please enter a shop name.");
      return;
    }
    const toSave = {
      ...editingSellerDraft,
      categories: Array.isArray(editingSellerDraft.categories)
        ? editingSellerDraft.categories
        : String(editingSellerDraft.categories || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    if (!writeJSON(SELLER_LS_KEY, toSave)) {
      toast.error("Unable to save profile (localStorage).");
      return;
    }
    setSellerProfile(toSave);
    setEditingSeller(false);
    toast.success("Seller profile saved.");
  };

  /* ---------- projects ---------- */

  const removeProject = (id) => {
    const next = projects.filter((p) => p.id !== id);
    if (!writeJSON(PROJECTS_LS_KEY, next)) {
      toast.error("Could not delete project.");
      return;
    }
    setProjects(next);
    toast.success("Project removed.");
  };

  const exportBooking = (b) => {
    try {
      const data = JSON.stringify(b, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `booking-${b.bookingId || b.orderId || b.title}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch {
      toast.error("Export failed");
    }
  };

  const copyBookingLink = async (b) => {
    try {
      const url = `${window.location.origin}/service/${b.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Service link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  /* ---------- small helpers ---------- */

  const prettyPrice = (p) => format.formatCurrency(Number(p) || 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10">
      <div className="container mx-auto px-6">
        <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Manage your bookings, seller profile and posted projects.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md px-2 py-1">
              <FaSearch className="text-gray-500 mr-2" />
              <input
                placeholder="Search bookings, providers or order id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100"
                aria-label="Search bookings"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm"
                aria-label="Sort bookings"
              >
                <option value="date_desc">Date (new → old)</option>
                <option value="date_asc">Date (old → new)</option>
                <option value="price_desc">Price (high → low)</option>
                <option value="price_asc">Price (low → high)</option>
              </select>
            </div>
          </div>
        </header>

        {/* Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total bookings</div>
            <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{totalBookings}</div>
            <div className="mt-4 text-xs text-gray-600 dark:text-gray-300">All-time bookings recorded in your account.</div>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Upcoming</div>
            <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{upcomingBookings}</div>
            <div className="mt-4 text-xs text-gray-600 dark:text-gray-300">Bookings with dates today or in the future.</div>
          </div>

          <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400">Estimated revenue</div>
            <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{format.formatCurrency(revenue)}</div>
            <div className="mt-4 text-xs text-gray-600 dark:text-gray-300">Sum of booking prices (no fees deducted).</div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bookings list */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg dark:shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">My Bookings</h2>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Showing {filtered.length} result{filtered.length !== 1 ? "s" : ""}.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // quick export of visible bookings
                      try {
                        const data = JSON.stringify(visible, null, 2);
                        const blob = new Blob([data], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `bookings-page-${page}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        toast.success("Export started");
                      } catch {
                        toast.error("Export failed");
                      }
                    }}
                    className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
                    title="Export visible bookings"
                  >
                    <FaDownload /> <span className="ml-2 hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>

              {/* list header (for small screens show stacked cards instead of a table) */}
              <div className="p-4">
                {visible.length === 0 ? (
                  <div className="p-8 text-center text-gray-700 dark:text-gray-300 font-semibold">No bookings match your filters.</div>
                ) : (
                  <div className="space-y-3">
                    {visible.map((b) => (
                      <div
                        key={b.bookingId || b.orderId || b.tempId}
                        className="flex flex-col md:flex-row items-start md:items-center gap-3 p-3 rounded-md border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <div className="w-full md:w-2/3 flex items-center gap-3">
                          <img
                            src={b.image}
                            alt={b.title}
                            className="w-16 h-16 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-black text-gray-900 dark:text-white truncate">{b.title}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">by {b.provider}</div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              {formatDateFriendly(b.bookingDate)} · {b.bookingTime}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Order: <span className="font-medium">{b.orderId}</span></div>
                          </div>
                        </div>

                        <div className="w-full md:w-1/3 flex items-center justify-between md:justify-end gap-3">
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-300">Price</div>
                            <div className="text-lg font-black text-gray-900 dark:text-white">{prettyPrice(b.price)}</div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleView(b)}
                              className="px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                            >
                              View
                            </button>

                            <button
                              onClick={() => handleConfirmCancel(b)}
                              className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-black focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* pagination */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Seller profile & Posted projects */}
          <aside className="space-y-6">
            {/* Seller profile */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white font-black">
                  <FaUser />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Seller profile</div>
                  <div className="font-black text-gray-900 dark:text-white">
                    {sellerProfile?.shopName || "Not set"}
                  </div>
                </div>
                <button
                  onClick={startEditSeller}
                  className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  title="Edit seller profile"
                >
                  <FaEdit />
                </button>
              </div>

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                {sellerProfile?.bio ? sellerProfile.bio : "Create a seller profile to receive direct project enquiries."}
              </div>

              {sellerProfile?.categories && sellerProfile.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sellerProfile.categories.map((c, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">{c}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Posted projects */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Posted projects</div>
                  <div className="font-black text-gray-900 dark:text-white">{projects.length || 0}</div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Local only</div>
              </div>

              <div className="mt-3 space-y-3">
                {projects.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No posted projects yet. Use "Post a Project" to create one.</div>
                ) : (
                  projects.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">{p.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.budget ? format.formatCurrency(p.budget) : "Budget not set"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // quick export project
                            try {
                              const data = JSON.stringify(p, null, 2);
                              const blob = new Blob([data], { type: "application/json" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `project-${p.id}.json`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                              toast.success("Export started");
                            } catch {
                              toast.error("Export failed");
                            }
                          }}
                          className="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Export project"
                        >
                          <FaExternalLinkAlt />
                        </button>

                        <button
                          onClick={() => removeProject(p.id)}
                          className="p-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                          title="Delete project"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {projects.length > 5 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => {
                      // view all: simply open raw list in a new tab as JSON
                      const data = JSON.stringify(projects, null, 2);
                      const blob = new Blob([data], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `posted-projects.json`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success("Export started");
                    }}
                    className="px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-semibold"
                  >
                    Export all
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Booking view modal */}
        {viewing && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setViewing(null)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-3xl w-full p-6 z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{viewing.title}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">by {viewing.provider}</div>
                </div>
                <button onClick={() => setViewing(null)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <FaTimes />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <img src={viewing.image} alt={viewing.title} className="w-full h-48 object-cover rounded-md border" />
                  <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">{viewing.description}</div>
                </div>

                <div className="md:col-span-1 space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Date</div>
                  <div className="font-black">{formatDateFriendly(viewing.bookingDate)}</div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">Time</div>
                  <div className="font-semibold">{viewing.bookingTime}</div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">Price</div>
                  <div className="text-lg font-black">{prettyPrice(viewing.price)}</div>

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => exportBooking(viewing)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">Export</button>
                    <button onClick={() => copyBookingLink(viewing)} className="px-3 py-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">Copy Link</button>
                    <button onClick={() => handleConfirmCancel(viewing)} className="px-3 py-2 rounded-md bg-red-600 text-white">Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm cancel modal */}
        {confirmCancelFor && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-lg w-full p-6 z-10">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Cancel booking</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Are you sure you want to cancel the booking for <strong>{confirmCancelFor.title}</strong> on {formatDateFriendly(confirmCancelFor.bookingDate)}?</p>

              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => setConfirmCancelFor(null)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800">Keep</button>
                <button onClick={() => performCancel(confirmCancelFor.bookingId)} className="px-3 py-2 rounded-md bg-red-600 text-white">Yes, cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit seller modal */}
        {editingSeller && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setEditingSeller(false)} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-w-2xl w-full p-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Edit seller profile</h3>
                <button onClick={() => setEditingSeller(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><FaTimes /></button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <label className="text-sm font-semibold">Shop / Business name</label>
                <input
                  value={editingSellerDraft.shopName}
                  onChange={(e) => setEditingSellerDraft((s) => ({ ...s, shopName: e.target.value }))}
                  className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />

                <label className="text-sm font-semibold">Short bio</label>
                <textarea
                  value={editingSellerDraft.bio}
                  onChange={(e) => setEditingSellerDraft((s) => ({ ...s, bio: e.target.value }))}
                  rows={4}
                  className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />

                <label className="text-sm font-semibold">Categories (comma separated)</label>
                <input
                  value={Array.isArray(editingSellerDraft.categories) ? editingSellerDraft.categories.join(", ") : editingSellerDraft.categories}
                  onChange={(e) => setEditingSellerDraft((s) => ({ ...s, categories: e.target.value }))}
                  className="p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />

                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingSeller(false)} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800">Cancel</button>
                  <button onClick={saveSellerProfile} className="px-3 py-2 rounded-md bg-orange-500 text-white font-black">Save profile</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live region */}
        <div className="sr-only" aria-live="polite" ref={liveRef} />

      </div>
    </div>
  );
};

export default Dashboard;
