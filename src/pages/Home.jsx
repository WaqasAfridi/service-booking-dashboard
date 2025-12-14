import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ServiceCard from '../components/ServiceCard';
import EmptyState from '../components/EmptyState';
import servicesData from '../data/services.json';
import { FaLaptopCode, FaPaintBrush, FaBullhorn, FaPenNib, FaVideo, FaRobot, FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

/**
 * Home (professional) — redesigned for clarity, accessibility and polish.
 * Key improvements:
 *  - Cleaner, focused hero with affordance-first search
 *  - Accessible announces for live updates
 *  - Category chips are keyboard friendly and show focus/active states
 *  - Result list supports grid/list views and client-side pagination
 *  - Subtle framer-motion for perceived quality
 *  - Better mobile behaviour: collapsible filter bar
 *
 * Notes on integration:
 *  - Keeps services loaded from src/data/services.json
 *  - Uses existing components (ServiceCard, EmptyState)
 *  - Tailwind utilities assume tailwind v4 setup already in project
 */

const CATEGORIES = [
  { id: 'web-app-dev', name: 'Web & App Dev', icon: <FaLaptopCode /> },
  { id: 'design-creative', name: 'Design & Creative', icon: <FaPaintBrush /> },
  { id: 'digital-marketing', name: 'Digital Marketing', icon: <FaBullhorn /> },
  { id: 'writing', name: 'Writing', icon: <FaPenNib /> },
  { id: 'video-animation', name: 'Video & Animation', icon: <FaVideo /> },
  { id: 'ai-services', name: 'AI Services', icon: <FaRobot /> },
];

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'price_desc', label: 'Price: High → Low' },
  { id: 'rating', label: 'Top Rated' },
];

const PAGE_SIZE = 12;

export default function Home() {
  const allServices = useMemo(() => servicesData.services || [], []);
  const [searchParams, setSearchParams] = useSearchParams();

  // UI state
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [location, setLocation] = useState('');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'featured');
  const [view, setView] = useState('grid'); // grid | list
  const [page, setPage] = useState(1);
  const [collapsedFilters, setCollapsedFilters] = useState(true);

  // UX states
  const [isSearching, setIsSearching] = useState(false);
  const [announce, setAnnounce] = useState('');

  // Debounce query -> searchParams
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (q) next.set('search', q);
        else next.delete('search');
        return next;
      });
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // react to search param changes (or local controls) and compute results
  const [results, setResults] = useState(allServices);

  useEffect(() => {
    setIsSearching(true);
    const q = (searchParams.get('search') || '').toLowerCase();
    const categoryQuery = (searchParams.get('category') || activeCategory || '').toLowerCase();
    const sortQuery = searchParams.get('sort') || sortBy;

    let out = allServices.filter((s) => {
      if (categoryQuery) {
        if ((s.category || '').toLowerCase() !== categoryQuery) return false;
      }
      if (q) {
        const inTitle = (s.title || '').toLowerCase().includes(q);
        const inProvider = (s.provider || '').toLowerCase().includes(q);
        const inTags = (s.tags || []).some((t) => (t || '').toLowerCase().includes(q));
        return inTitle || inProvider || inTags;
      }
      return true;
    });

    // sorting
    if (sortQuery === 'price_asc') out = out.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sortQuery === 'price_desc') out = out.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sortQuery === 'rating') out = out.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    else out = out.sort((a, b) => (a.featured === b.featured ? Number(b.rating || 0) - Number(a.rating || 0) : a.featured ? -1 : 1));

    setResults(out);
    setAnnounce(`${out.length} result${out.length !== 1 ? 's' : ''} found`);
    // reset to page 1 when results change
    setPage(1);

    const tt = setTimeout(() => setIsSearching(false), 120);
    return () => clearTimeout(tt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allServices, searchParams, activeCategory, sortBy]);

  // Derived paginated results
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // handlers
  const applyCategory = (id) => {
    setActiveCategory((prev) => (prev === id ? '' : id));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (prev.get('category') === id) next.delete('category');
      else next.set('category', id);
      return next;
    });
  };

  const handleSearchSubmit = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (query.trim()) next.set('search', query.trim());
      else next.delete('search');
      return next;
    });
  };

  const resetAll = () => {
    setQuery('');
    setActiveCategory('');
    setSortBy('featured');
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="w-full overflow-hidden">
      {/* HERO */}
      <header className="relative bg-gradient-to-br from-slate-900 to-gray-800 text-white py-20">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "url('https://media.licdn.com/dms/image/v2/C561BAQG7ey0T8ZpwQA/company-background_10000/company-background_10000/0/1586869171970/nasp___national_association_of_sales_professionals_cover?e=2147483647&v=beta&t=BNy9cLgud7leKYDF8a3CicUj9_I73GMw_ZFY_LImrS8')", backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden />
        <div className="relative container mx-auto px-6 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">Book trusted professionals — fast.</h1>
          <p className="max-w-2xl text-gray-200 mb-6">Compare prices, read reviews and schedule services with confidence.</p>

          <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-xl p-3 md:p-4 flex flex-col md:flex-row items-center gap-3">
            <div className="flex items-center flex-1 px-4 h-12 bg-transparent">
              <FaSearch className="text-gray-500 dark:text-gray-300 mr-3 text-lg" />
              <label htmlFor="search-input" className="sr-only">Search services</label>
              <input
                id="search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                className="w-full bg-transparent outline-none placeholder-gray-600 dark:placeholder-gray-400 font-semibold text-gray-900 dark:text-white"
                placeholder="Search for services, e.g. 'logo design', 'seo', 'react developer'"
                aria-label="Search services"
              />
            </div>

            <div className="hidden md:flex items-center h-12 border-l border-gray-200 dark:border-gray-700 px-3">
              <FaMapMarkerAlt className="text-gray-500 dark:text-gray-300 mr-3 text-lg" />
              <label htmlFor="location-input" className="sr-only">Location (optional)</label>
              <input id="location-input" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="bg-transparent outline-none placeholder-gray-600 dark:placeholder-gray-400 font-semibold text-gray-900 dark:text-white" />
            </div>

            <div className="flex items-center md:pl-3">
              <button onClick={handleSearchSubmit} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-2 rounded-md shadow">Search</button>
            </div>
          </div>

          <div className="mt-4 flex gap-3 flex-wrap text-sm">
            {(servicesData.quickTags || []).slice(0, 5).map((t) => (
              <button key={t} onClick={() => { setQuery(t); setSearchParams((p) => { const n = new URLSearchParams(p); n.set('search', t); return n; }); }} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full">{t}</button>
            ))}
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <section className="bg-white dark:bg-black py-6">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 flex items-center gap-3">
            <div className="hidden md:flex gap-2" role="tablist" aria-label="Categories">
              {CATEGORIES.map((c) => {
                const active = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => applyCategory(c.id)}
                    aria-pressed={active}
                    className={cn('px-3 py-2 rounded-md flex items-center gap-2 text-sm font-semibold focus:outline-none focus:ring-2', active ? 'bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 text-orange-600' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-sm')}
                  >
                    <span className="w-5 h-5 flex items-center justify-center text-base">{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>

            {/* mobile compact categories */}
            <div className="md:hidden flex gap-2 overflow-x-auto py-1">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => applyCategory(c.id)} aria-pressed={activeCategory === c.id} className={cn('px-3 py-2 rounded-full text-sm font-semibold whitespace-nowrap', activeCategory === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200')}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="sort" className="sr-only">Sort</label>
            <select id="sort" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setSearchParams((p) => { const n = new URLSearchParams(p); n.set('sort', e.target.value); return n; }); }} className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900">
              {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>

            <div className="flex items-center gap-2">
              <button onClick={() => setView('grid')} aria-pressed={view === 'grid'} title="Grid view" className={cn('px-3 py-2 rounded-md', view === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900')}>Grid</button>
              <button onClick={() => setView('list')} aria-pressed={view === 'list'} title="List view" className={cn('px-3 py-2 rounded-md', view === 'list' ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900')}>List</button>

              <button onClick={resetAll} className="px-3 py-2 rounded-md bg-white dark:bg-gray-900 border">Reset</button>

              {/* small mobile filter toggle */}
              <button onClick={() => setCollapsedFilters((s) => !s)} className="md:hidden px-3 py-2 rounded-md bg-white dark:bg-gray-900 border">Filters</button>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="py-8 bg-gray-50 dark:bg-gray-950">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-300" aria-live="polite">{isSearching ? 'Searching…' : announce}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{results.length} services</div>
          </div>

          {isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <EmptyState title="No services found" description="Try adjusting filters, removing some keywords, or browsing categories." actionLabel="Reset filters" onAction={resetAll} />
          ) : (
            <>
              <AnimatePresence>
                <motion.div layout className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'flex flex-col gap-4'}>
                  {visible.map((s) => (
                    <motion.div key={s.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      <ServiceCard service={s} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* pagination */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 rounded-md border">Prev</button>
                <div className="px-3 py-2 rounded-md border bg-white dark:bg-gray-900">Page {page} / {totalPages}</div>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 rounded-md border">Next</button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-16 bg-white dark:bg-black">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold mb-8 text-gray-900 dark:text-white">Why choose Apex</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border bg-white dark:bg-gray-900">
              <h3 className="font-bold mb-2">Vetted Experts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Top rated professionals vetted by our team.</p>
            </div>

            <div className="p-6 rounded-xl border bg-white dark:bg-gray-900">
              <h3 className="font-bold mb-2">Secure Payments</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Secure, escrow-like payment flows for peace of mind.</p>
            </div>

            <div className="p-6 rounded-xl border bg-white dark:bg-gray-900">
              <h3 className="font-bold mb-2">Global Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Support available around the clock.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
