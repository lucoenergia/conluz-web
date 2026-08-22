/** Spanish-locale percentage formatter (decimal comma). Input is a 0-1 scale value. */
export function formatPercentage(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("es-ES", {
    style: "percent",
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    ...options,
  }).format(value);
}
