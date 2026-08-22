/** Spanish-locale kW formatter (decimal comma, 2 decimals). */
export function formatKilowatts(value: number, options?: Intl.NumberFormatOptions): string {
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);

  return `${formatted} kW`;
}
