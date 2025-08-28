const MILIS_IN_DAY = 1000 * 60 * 60 * 24;
const MILIS_IN_MONTH = MILIS_IN_DAY * 30;
const MILIS_IN_YEAR = MILIS_IN_DAY * 365;


export function getTimeRange(startDate: Date, endDate: Date): string {
  const difference = Math.abs(endDate.getTime() - startDate.getTime());
  if (difference / (MILIS_IN_YEAR) > 2) { // The difference between the dates is larger than 2 years
    return 'year'
  }
  if (difference / (MILIS_IN_MONTH) > 2) { // The difference between the dates is larger than 2 months
    return 'month'
  }
  if (difference / (MILIS_IN_DAY) > 2) { // The difference between the dates is larger than 2 days
    return 'day'
  }
  return 'hour'
}
