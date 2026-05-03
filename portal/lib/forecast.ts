/**
 * Linear-regression forecast utilities.
 *
 * Given a time series of (x, y) pairs, fits a least-squares line and
 * projects forward to find when y will cross a threshold.
 */

export interface DataPoint {
  x: number; // epoch ms
  y: number;
}

export interface Regression {
  slope: number;     // change in y per ms
  intercept: number;
  r2: number;        // coefficient of determination
}

export function linearRegression(points: DataPoint[]): Regression | null {
  const n = points.length;
  if (n < 2) return null;

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXX = 0, ssXY = 0, ssYY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  if (ssXX === 0) return null;

  const slope = ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  const r2 = ssYY === 0 ? 1 : (ssXY * ssXY) / (ssXX * ssYY);

  return { slope, intercept, r2 };
}

/**
 * Project when the trend line will cross `threshold`.
 * Returns a Date, or null if the trend is flat or already past threshold.
 */
export function forecastCrossing(
  points: DataPoint[],
  threshold: number,
  fromNow: Date = new Date(),
): Date | null {
  const reg = linearRegression(points);
  if (!reg || reg.slope <= 0) return null;

  // y = slope * x + intercept  →  x = (threshold - intercept) / slope
  const crossX = (threshold - reg.intercept) / reg.slope;
  if (crossX <= fromNow.getTime()) return null; // already crossed

  return new Date(crossX);
}

/** Format a Date as a human-readable relative string (weeks/months) */
export function formatForecast(d: Date | null): string {
  if (!d) return "No trend";
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days < 7) return `${days}d`;
  if (days < 60) return `~${Math.round(days / 7)}w`;
  return `~${Math.round(days / 30)}mo`;
}
