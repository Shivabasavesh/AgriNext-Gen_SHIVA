const missingMessage = (key: string) => `Missing/invalid ${key}`;

export function requireString(obj: Record<string, unknown>, key: string) {
  const value = obj?.[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(missingMessage(key));
  }
  return value;
}

export function requireNumber(obj: Record<string, unknown>, key: string) {
  const value = obj?.[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(missingMessage(key));
  }
  return value;
}

export function requireObject(
  obj: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = obj?.[key];
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(missingMessage(key));
  }
  return value as Record<string, unknown>;
}

export function optionalString(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = obj?.[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(missingMessage(key));
  }
  return value;
}
