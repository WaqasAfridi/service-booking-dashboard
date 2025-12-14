// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  FaShoppingCart,
  FaUserCircle,
  FaMoon,
  FaSun,
  FaBars,
  FaTimes,
  FaChevronDown,
  FaBell,
} from "react-icons/fa";
import { useBooking } from "../context/BookingContext";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

/**
 * Navbar - updated
 * - Removed search (hero has one)
 * - Added Become a Seller modal (saves profile to localStorage)
 * - Added Post a Project modal (saves project to localStorage)
 * - Visible background for light/dark (so content is readable on all themes)
 * - Accessible: skip link, aria, ESC & click-outside, focus-first-input for modals
 */

const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      cn(
        "px-3 py-2 rounded-md text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400",
        isActive ? "text-orange-500" : "text-gray-700 dark:text-gray-200 hover:text-orange-500"
      )
    }
  >
    {children}
  </NavLink>
);

const Modal = ({ open, onClose, title, children, ariaId }) => {
  const firstRef = useRef(null);

  useEffect(() => {
    if (open) {
      // focus the first interactive element inside modal
      setTimeout(() => {
        if (firstRef.current) firstRef.current.focus();
      }, 50);
      // prevent background scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaId}
      className="fixed inset-0 z-60 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-xl bg-white/95 dark:bg-black/90 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6 z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id={ariaId} className="text-lg font-black text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <FaTimes />
          </button>
        </div>
        <div>{React.cloneElement(children, { firstRef })}</div>
      </div>
    </div>
  );
};

const BecomeSellerForm = ({ firstRef, onDone }) => {
  const [shopName, setShopName] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!shopName.trim()) {
      toast.error("Please enter a shop name.");
      return;
    }
    const profile = {
      shopName: shopName.trim(),
      bio: bio.trim(),
      categories: categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("apex-seller-profile", JSON.stringify(profile));
      toast.success("Seller profile saved. Welcome aboard!");
      onDone();
    } catch {
      toast.error("Unable to save profile.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-1">Shop / Business Name</label>
        <input
          ref={firstRef}
          required
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="e.g. DevMasters Studio"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1">Short Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Briefly tell buyers who you are and what you do"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1">Categories (comma separated)</label>
        <input
          value={categories}
          onChange={(e) => setCategories(e.target.value)}
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="e.g. Web Dev, Design, SEO"
        />
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-orange-500 text-white font-black hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          Save & Continue
        </button>
      </div>
    </form>
  );
};

const PostProjectForm = ({ firstRef, onDone }) => {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [budget, setBudget] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Project title is required.");
      return;
    }
    const project = {
      id: `p_${Date.now()}`,
      title: title.trim(),
      details: details.trim(),
      budget: budget ? Number(budget) : null,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("apex-posted-projects");
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(project);
      localStorage.setItem("apex-posted-projects", JSON.stringify(arr));
      toast.success("Project posted (mock). Providers will contact you.");
      onDone();
    } catch {
      toast.error("Unable to save project.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-1">Project Title</label>
        <input
          ref={firstRef}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="e.g. Build a landing page in React"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1">Details</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={4}
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="Describe scope, timeline, and expectations"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1">Budget (optional)</label>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          inputMode="numeric"
          className="w-full p-3 rounded-md border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          placeholder="e.g. 500"
        />
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black hover:from-orange-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          Post Project
        </button>
      </div>
    </form>
  );
};

const Navbar = () => {
  const { cartCount = 0 } = useBooking();
  const navigate = useNavigate();

  // theme
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem("apex-theme");
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  // menus
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // modals
  const [becomeOpen, setBecomeOpen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        localStorage.setItem("apex-theme", "dark");
      } else {
        root.classList.remove("dark");
        localStorage.setItem("apex-theme", "light");
      }
    } catch {
      /* ignore */
    }
  }, [isDark]);

  // close profile on click outside
  useEffect(() => {
    function onDoc(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // ESC closes menus + modals
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
        setBecomeOpen(false);
        setPostOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // when seller sign-up completes
  const onSellerDone = () => {
    setBecomeOpen(false);
    navigate("/dashboard#seller");
  };

  // after posting a project
  const onPostDone = () => {
    setPostOpen(false);
    navigate("/dashboard#projects");
  };

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:bg-white focus:dark:bg-gray-900 focus:px-4 focus:py-2 focus:rounded focus:shadow">
        Skip to content
      </a>

      {/* main header: visible bg for both light/dark */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-black/85 backdrop-blur-sm">
        <nav className="container mx-auto px-6 py-3 flex items-center gap-4 justify-between" aria-label="Primary">
          {/* left: brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-orange-400 rounded-md" aria-label="Apex home">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold text-lg shadow-md">A</div>
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="text-lg font-black text-gray-900 dark:text-white">Apex</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">Book professionals instantly</span>
              </div>
            </Link>
          </div>

          {/* center nav items (no search here) */}
          <div className="hidden lg:flex items-center gap-4">
            <NavItem to="/">Explore</NavItem>
            {/* Become a Seller now opens modal */}
            <button
              onClick={() => setBecomeOpen(true)}
              className="px-3 py-2 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              Become a Seller
            </button>
          </div>

          {/* right side actions */}
          <div className="flex items-center gap-2">
            {/* Primary CTA: opens Post Project modal */}
            <button
              onClick={() => setPostOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black shadow hover:from-orange-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              Post a Project
            </button>

            {/* theme toggle */}
            <button
              onClick={() => setIsDark((s) => !s)}
              aria-pressed={isDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-orange-400"
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-gray-700" />}
            </button>

            {/* notifications placeholder */}
            <button aria-label="Notifications" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-orange-400">
              <FaBell className="text-gray-700 dark:text-gray-200" />
            </button>

            {/* cart */}
            <Link to="/cart" aria-label={`Cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`} className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-orange-400">
              <FaShoppingCart className="text-gray-700 dark:text-gray-100" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-black w-5 h-5 flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </Link>

            {/* profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((s) => !s)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                title="Account"
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg text-gray-700 dark:text-gray-100">
                  <FaUserCircle />
                </div>
                <FaChevronDown className={cn("text-sm transition-transform", profileOpen ? "rotate-180" : "rotate-0")} />
              </button>

              <div
                role="menu"
                aria-hidden={!profileOpen}
                className={cn(
                  "absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 py-2 z-50 transition-all",
                  profileOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
                )}
              >
                <button role="menuitem" onClick={() => { setProfileOpen(false); navigate("/dashboard"); }} className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">Dashboard</button>
                <button role="menuitem" onClick={() => { setProfileOpen(false); const raw = localStorage.getItem("apex-seller-profile"); if (!raw) { setBecomeOpen(true); } else { navigate("/dashboard#seller"); } }} className="w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800">My Seller Profile</button>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <button role="menuitem" onClick={() => { setProfileOpen(false); toast("Signed out (mock)"); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-gray-50 dark:hover:bg-gray-800">Sign out</button>
              </div>
            </div>

            {/* mobile menu toggle */}
            <button onClick={() => setMenuOpen((s) => !s)} aria-expanded={menuOpen} aria-controls="mobile-menu" className="sm:hidden p-2 rounded-md ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400">
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </nav>

        {/* mobile panel */}
        <div id="mobile-menu" className={cn("sm:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-all", menuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 overflow-hidden")}>
          <div className="container mx-auto px-6 py-4 flex flex-col gap-3">
            <Link to="/" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md font-semibold">Explore</Link>
            <button onClick={() => { setMenuOpen(false); setBecomeOpen(true); }} className="px-3 py-2 rounded-md font-semibold">Become a Seller</button>
            <Link to="/cart" onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-md font-semibold">Cart {cartCount > 0 && <span className="ml-2 font-black">({cartCount})</span>}</Link>
            <button onClick={() => { setMenuOpen(false); setIsDark((s) => !s); }} className="px-3 py-2 rounded-md font-semibold">{isDark ? "Light mode" : "Dark mode"}</button>
            <button onClick={() => { setMenuOpen(false); setPostOpen(true); }} className="px-3 py-2 rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black">Post a Project</button>
          </div>
        </div>
      </header>

      {/* Become a Seller modal */}
      <Modal open={becomeOpen} onClose={() => setBecomeOpen(false)} title="Become a Seller" ariaId="become-seller-title">
        <BecomeSellerForm firstRef={null} onDone={onSellerDone} />
      </Modal>

      {/* Post a Project modal */}
      <Modal open={postOpen} onClose={() => setPostOpen(false)} title="Post a Project" ariaId="post-project-title">
        <PostProjectForm firstRef={null} onDone={onPostDone} />
      </Modal>
    </>
  );
};

export default Navbar;
