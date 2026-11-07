const pacificDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Los_Angeles",
  year: "numeric",
});

export function getPacificDateKey(date = new Date()) {
  const values = Object.fromEntries(
    pacificDateFormatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidBirthday(month = "", day = "", year = "") {
  if (!/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) return false;
  if (year && (!/^\d{4}$/.test(year) || Number(year) === 0)) return false;

  const monthNumber = Number(month);
  const dayNumber = Number(day);
  // A missing year still allows February 29.
  const date = new Date(0);
  date.setUTCFullYear(year ? Number(year) : 2000, monthNumber - 1, dayNumber);
  return date.getUTCMonth() === monthNumber - 1 && date.getUTCDate() === dayNumber;
}

export function isBirthdayOn(
  month: string | undefined,
  day: string | undefined,
  dateKey = getPacificDateKey(),
) {
  const [, currentMonth, currentDay] = dateKey.split("-");
  return isValidBirthday(month, day) &&
    Number(month) === Number(currentMonth) &&
    Number(day) === Number(currentDay);
}
