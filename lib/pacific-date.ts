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
