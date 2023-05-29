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
  };

  const formatter = new Intl.DateTimeFormat("default", options);
  const parts = formatter.formatToParts(today);

  let currentDate = "";
  for (const part of parts) {
    if (part.type === "year") {
      currentDate += part.value;
    } else if (part.type === "month") {
      currentDate += `-${part.value.padStart(2, "0")}`;
    } else if (part.type === "day") {
      currentDate += `-${part.value.padStart(2, "0")}`;
    }
  }
  return currentDate;
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
  };

  // Subtract one day from the current date
  const previousDate = new Date(today);
  previousDate.setDate(previousDate.getDate() - 1);

  const formatter = new Intl.DateTimeFormat("default", options);
  const parts = formatter.formatToParts(previousDate);

  let date = "";
  for (const part of parts) {
    if (part.type === "year") {
      date += part.value;
    } else if (part.type === "month") {
      date += `-${part.value.padStart(2, "0")}`;
    } else if (part.type === "day") {
      date += `-${part.value.padStart(2, "0")}`;
    }
  }
  return date;
}
