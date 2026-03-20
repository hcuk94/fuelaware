export function formatPrice(value: number, currency: string, unit: string) {
  return `${new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 3
  }).format(value)}/${unit}`;
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
