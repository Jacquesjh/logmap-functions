/**
 * Retrieves the current date in the timezone of America/Sao_Paulo.
 * The date is formatted as "YYYY-MM-DD".
 *
 * @return {string} The current date in the format "YYYY-MM-DD".
 */
export function getSaoPauloTimeZoneCurrentDate() {
  const today = new Date();
  const options = {
    timeZone: "America/Sao_Paulo",
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const formattedDate = formatter.format(today);

  return formattedDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
}

/**
 * Retrieves the previous date in the timezone of America/Sao_Paulo.
 * The date is formatted as "YYYY-MM-DD".
 *
 * @return {string} The previous date in the format "YYYY-MM-DD".
 */
export function getSaoPauloTimeZonePreviousDate() {
  const today = new Date();
  const options = {
    timeZone: "America/Sao_Paulo",
    year: "numeric" as const,
    month: "2-digit" as const,
    day: "2-digit" as const,
  };

  // Subtract one day from the current date
  const previousDate = new Date(today);
  previousDate.setDate(previousDate.getDate() - 1);

  const formatter = new Intl.DateTimeFormat("default", options);
  const formattedDate = formatter.format(today);

  return formattedDate.replace(/(\d\d)\/(\d\d)\/(\d{4})/, "$3-$1-$2");
}
