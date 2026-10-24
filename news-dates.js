// Shared date helpers for news pages.
// Dates are "YYYY-MM-DD", or "YYYY-MM" when only the month is known.

/**
 * Parse a news date as a local date, so it shows the same day in every time zone
 */
function parseNewsDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Format a news date; month-only dates omit the day (e.g. "July 2024")
 */
function formatNewsDateString(dateStr, monthStyle, includeYear = true) {
    const options = { month: monthStyle };
    if (dateStr.split('-').length > 2) options.day = 'numeric';
    if (includeYear) options.year = 'numeric';
    return parseNewsDate(dateStr).toLocaleDateString('en-US', options);
}
