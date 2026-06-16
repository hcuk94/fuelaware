function normalizeComparableText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function stripGenericStationSuffix(name: string) {
  return name
    .replace(/\b(?:filling|service|petrol)\s+station$/i, "")
    .replace(/[,\-–\s]+$/g, "")
    .trim();
}

export function buildDisplayStationName(name: string, brand?: string | null) {
  const trimmedName = name.trim();
  const trimmedBrand = brand?.trim();

  if (!trimmedBrand) {
    return trimmedName;
  }

  const normalizedName = normalizeComparableText(trimmedName);
  const normalizedBrand = normalizeComparableText(trimmedBrand);

  if (!normalizedName || !normalizedBrand) {
    return trimmedName;
  }

  if (normalizedName.includes(normalizedBrand) || normalizedBrand.includes(normalizedName)) {
    return trimmedName;
  }

  const shortenedName = stripGenericStationSuffix(trimmedName);
  if (!shortenedName || shortenedName === trimmedName) {
    return trimmedName;
  }

  const normalizedShortName = normalizeComparableText(shortenedName);
  if (!normalizedShortName) {
    return trimmedName;
  }

  if (normalizedShortName.includes(normalizedBrand) || normalizedBrand.includes(normalizedShortName)) {
    return shortenedName;
  }

  return `${trimmedBrand} ${shortenedName}`;
}
