/**
 * Spanish-locale power in kW, written as kWh figures are: no decimals for
 * whole amounts, at most two otherwise and no trailing zeros -- "63 kW",
 * "120,5 kW", "120,57 kW".
 */
export function formatKilowatts(value: number): string {
  const formatted = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value);

  return `${formatted} kW`;
}
