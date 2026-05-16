export const usernamePattern =
  /^(?!.*--)[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function normalizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
}

export function isValidUsername(value: string) {
  return usernamePattern.test(value);
}
