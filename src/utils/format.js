// src/utils/format.js

/**
 * Lightweight formatting utilities (dates & currency) using the Intl API.
 * Keep pure, locale-aware, and safe for null/undefined values.
 */

/**
 * Format a numeric value as currency.
 * @param {number|string} value - numeric value
 * @param {string} [locale=navigator.language] - locale string like 'en-US'
 * @param {string} [currency='USD'] - currency code like 'USD', 'PKR'
 * @returns {string} formatted currency or '-' on invalid input
 */
export function formatCurrency(
	value,
	locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
	currency = "USD"
) {
	const n = Number(value);
	if (!isFinite(n)) return "-";
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			maximumFractionDigits: 0,
		}).format(n);
	} catch {
		return String(n);
	}
}

/**
 * Convert Date or ISO string to an ISO YYYY-MM-DD string.
 * @param {Date|string|number} input
 * @returns {string|null}
 */
export function toISODate(input) {
	try {
		const d = input instanceof Date ? input : new Date(input);
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString().slice(0, 10);
	} catch {
		return null;
	}
}

/**
 * Format an ISO date string or Date object into a readable string.
 * @param {string|Date} input - ISO string or Date
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @param {string} [locale=navigator.language]
 * @returns {string} formatted date or '-' when invalid
 */
export function formatDate(
	input,
	options = {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
	},
	locale = typeof navigator !== "undefined" ? navigator.language : "en-US"
) {
	try {
		const d = input instanceof Date ? input : new Date(input);
		if (Number.isNaN(d.getTime())) return "-";
		return new Intl.DateTimeFormat(locale, options).format(d);
	} catch {
		return "-";
	}
}

/**
 * Returns a short relative time (e.g., "in 2 days", "3 hours ago").
 * Uses Intl.RelativeTimeFormat when available; falls back to simple labels.
 * @param {string|Date} input
 * @param {string} [locale=navigator.language]
 * @returns {string}
 */
export function formatRelative(
	input,
	locale = typeof navigator !== "undefined" ? navigator.language : "en-US"
) {
	try {
		const now = Date.now();
		const d = input instanceof Date ? input : new Date(input);
		if (Number.isNaN(d.getTime())) return "";
		const diff = Math.round((d.getTime() - now) / 1000); // seconds
		const abs = Math.abs(diff);

		const rtf =
			typeof Intl !== "undefined" && Intl.RelativeTimeFormat
				? new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
				: null;

		const units = [
			{ unit: "year", secs: 60 * 60 * 24 * 365 },
			{ unit: "month", secs: 60 * 60 * 24 * 30 },
			{ unit: "day", secs: 60 * 60 * 24 },
			{ unit: "hour", secs: 60 * 60 },
			{ unit: "minute", secs: 60 },
			{ unit: "second", secs: 1 },
		];

		for (const { unit, secs } of units) {
			if (abs >= secs || unit === "second") {
				const value = Math.round(diff / secs);
				if (rtf) return rtf.format(value, unit);
				// fallback
				return value === 0
					? "now"
					: value > 0
					? `in ${value} ${unit}${Math.abs(value) !== 1 ? "s" : ""}`
					: `${Math.abs(value)} ${unit}${Math.abs(value) !== 1 ? "s" : ""} ago`;
			}
		}
		return "";
	} catch {
		return "";
	}
}

/**
 * Check if an ISO/date is in the past (strict).
 * @param {string|Date} input
 * @returns {boolean}
 */
export function isPast(input) {
	try {
		const d = input instanceof Date ? input : new Date(input);
		if (Number.isNaN(d.getTime())) return false;
		return d.getTime() < Date.now();
	} catch {
		return false;
	}
}

/**
 * Format price with short style (e.g., 1.2K, 3M) – useful for UI badges.
 * @param {number} value
 * @returns {string}
 */
export function formatShortNumber(value) {
	const n = Number(value);
	if (!isFinite(n)) return String(value);
	const abs = Math.abs(n);
	if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
	if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return String(n);
}

const format = {
	formatCurrency,
	toISODate,
	formatDate,
	formatRelative,
	isPast,
	formatShortNumber,
};

export default format;
