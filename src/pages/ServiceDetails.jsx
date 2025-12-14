// src/pages/ServiceDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import servicesData from "../data/services.json";
import { useBooking } from "../context/BookingContext";
import {
  FaStar,
  FaCheck,
  FaClock,
  FaUserCircle,
  FaShareAlt,
  FaHeart,
  FaChevronLeft,
} from "react-icons/fa";
import toast from "react-hot-toast";
import format from "../utils/format";
import { motion } from "framer-motion";

/**
 * ServiceDetails - improved:
 * - Accessible breadcrumbs & headings
 * - Gallery with thumbnail selection
 * - Provider card with rating + CTA that respects cart state
 * - Locale-aware currency via format util
 * - Share / copy link support
 * - Cleaner visual hierarchy and ARIA attributes
 */

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasInCart } = useBooking();

  const service = useMemo(
    () => servicesData.services.find((s) => Number(s.id) === Number(id)) || null,
    [id]
  );

  const [selectedImage, setSelectedImage] = useState(service?.image ?? "");
  const [liked, setLiked] = useState(() => {
    try {
      return localStorage.getItem(`fav-service-${id}`) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (service) {
      document.title = `${service.title} — Apex`;
      setSelectedImage(service.image || (service.gallery && service.gallery[0]) || "");
    }
  }, [service]);

  useEffect(() => {
    try {
      localStorage.setItem(`fav-service-${id}`, liked ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [liked, id]);

  if (!service)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-gray-800 dark:text-gray-200 font-bold mb-4">Service not found</p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-black px-4 py-2 rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <FaChevronLeft /> Back to Home
          </button>
        </div>
      </div>
    );

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: service.title,
          text: `${service.title} — ${service.provider}`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Unable to copy link");
      }
    }
  };

  const inCartAny = hasInCart(service.id);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen py-10">
      <div className="container mx-auto px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-600 dark:text-gray-300 mb-6 font-medium">
          <ol className="inline-flex items-center gap-2">
            <li>
              <Link to="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link to={`/?search=${service.category}`} className="hover:underline">
                {servicesData.categories.find((c) => c.id === service.category)?.name || "Services"}
              </Link>
            </li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="text-gray-900 dark:text-white font-bold">
              {service.title}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <main className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{service.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <FaUserCircle className="text-xl text-gray-700 dark:text-gray-300" />
                  <span className="font-semibold">{service.provider}</span>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <FaStar className="text-yellow-500" />
                  <span className="font-black">{service.rating}</span>
                  <span className="text-xs text-gray-500">({service.reviews})</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLiked((v) => !v)}
                    aria-pressed={liked}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    title={liked ? "Remove from favorites" : "Add to favorites"}
                  >
                    <FaHeart className={`text-lg ${liked ? "text-red-500" : "text-gray-600 dark:text-gray-300"}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    title="Share service"
                  >
                    <FaShareAlt className="text-lg text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>
            </header>

            {/* Gallery */}
            <section aria-labelledby="gallery-heading" className="mb-8">
              <h2 id="gallery-heading" className="sr-only">
                Gallery
              </h2>

              <div className="rounded-xl overflow-hidden border-2 border-gray-300 dark:border-gray-800">
                <motion.img
                  key={selectedImage}
                  src={selectedImage}
                  alt={`${service.title} - image`}
                  loading="lazy"
                  className="w-full h-96 object-cover bg-gray-100 dark:bg-gray-800"
                  initial={{ opacity: 0.7, scale: 0.995 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                />
              </div>

              {service.gallery && service.gallery.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-auto">
                  {[service.image, ...service.gallery].map((g, idx) => (
                    <button
                      key={g + idx}
                      onClick={() => setSelectedImage(g)}
                      className={`w-20 h-14 flex-shrink-0 rounded-md overflow-hidden border-2 focus:outline-none focus:ring-2 ${selectedImage === g
                          ? "border-orange-500"
                          : "border-gray-200 dark:border-gray-700"
                        }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={g} alt={`${service.title} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Description & Features */}
            <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg dark:shadow-2xl dark:shadow-black/30 mb-8 border-2 border-gray-300 dark:border-gray-800">
              <h3 className="text-xl font-black mb-4 text-gray-900 dark:text-white">Description</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">{service.description}</p>

              <div className="mb-6">
                <h4 className="text-lg font-black text-gray-900 dark:text-white mb-3">What's included</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 font-medium">
                      <FaCheck className="text-green-700 dark:text-green-400 mt-1 flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {service.tags && service.tags.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => navigate(`/?search=${encodeURIComponent(t)}`)}
                        className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="relative">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/30 sticky top-24 border-2 border-gray-300 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-700 dark:text-gray-300 font-black">Price</div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {format.formatCurrency(service.price)}
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 text-sm mb-4 font-semibold">
                <FaClock /> <span>{service.deliveryTime} Delivery</span>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">Provider</div>
                <div className="ml-auto flex items-center gap-3">
                  <img
                    src={service.providerAvatar}
                    alt={`${service.provider} avatar`}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    loading="lazy"
                  />
                  <div className="text-sm">
                    <div className="font-black text-gray-900 dark:text-white">{service.provider}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{service.reviews} reviews</div>
                  </div>
                </div>
              </div>

              {/* Primary CTA behavior: if service already in cart show View Cart */}
              <div className="space-y-3">
                {!inCartAny ? (
                  <button
                    onClick={() => navigate(`/booking/${service.id}`)}
                    className="w-full bg-orange-500 text-white font-black py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400"
                    aria-label="Continue to booking"
                  >
                    Continue to Booking
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate("/cart")}
                      className="w-full bg-indigo-600 text-white font-black py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      View In Cart
                    </button>
                    <button
                      onClick={() => navigate(`/booking/${service.id}`)}
                      className="w-full text-sm font-bold text-gray-700 dark:text-gray-300 hover:underline"
                    >
                      Book another slot
                    </button>
                  </div>
                )}

                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:underline"
                >
                  View provider profile
                </button>
              </div>

              <div className="mt-6 border-t pt-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between mb-2">
                  <span>Secure Payment</span>
                  <span className="font-semibold">Escrow</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Support</span>
                  <span className="font-semibold">24/7</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails;
