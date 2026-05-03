import { describe, it, expect } from "vitest";
import { linearRegression, forecastCrossing, formatForecast } from "./forecast";

const DAY = 86400000; // ms

describe("linearRegression", () => {
  it("returns null for fewer than 2 points", () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
  });

  it("fits a perfect positive slope", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 4 },
    ];
    const reg = linearRegression(points);
    expect(reg).not.toBeNull();
    expect(reg!.slope).toBeCloseTo(2, 5);
    expect(reg!.intercept).toBeCloseTo(0, 5);
    expect(reg!.r2).toBeCloseTo(1, 5);
  });

  it("returns r2 of 1 for horizontal line", () => {
    const points = [
      { x: 0, y: 5 },
      { x: 1, y: 5 },
      { x: 2, y: 5 },
    ];
    const reg = linearRegression(points);
    expect(reg).not.toBeNull();
    expect(reg!.r2).toBe(1);
  });
});

describe("forecastCrossing", () => {
  it("returns null for flat trend", () => {
    const points = [
      { x: 0, y: 5 },
      { x: DAY, y: 5 },
    ];
    expect(forecastCrossing(points, 10)).toBeNull();
  });

  it("returns null when trend already past threshold", () => {
    const now = Date.now();
    const points = [
      { x: now - 2 * DAY, y: 12 },
      { x: now - DAY, y: 14 },
    ];
    // threshold of 10 was crossed long ago
    expect(forecastCrossing(points, 10, new Date(now))).toBeNull();
  });

  it("returns a future Date when trend will cross threshold", () => {
    const now = Date.now();
    // Growing by 1 kW per day, currently at 5 kW → hits 10 kW in ~5 days
    const points = [
      { x: now - 7 * DAY, y: 3 },
      { x: now - 6 * DAY, y: 4 },
      { x: now - 5 * DAY, y: 5 },
      { x: now - 4 * DAY, y: 6 },
      { x: now - 3 * DAY, y: 7 },
      { x: now - 2 * DAY, y: 8 },
      { x: now - DAY, y: 9 },
      { x: now, y: 10 },
    ];
    const crossing = forecastCrossing(points, 16, new Date(now));
    // Should be roughly 6 days from now
    expect(crossing).not.toBeNull();
    expect(crossing!.getTime()).toBeGreaterThan(now);
  });
});

describe("formatForecast", () => {
  it("returns 'No trend' for null", () => {
    expect(formatForecast(null)).toBe("No trend");
  });

  it("formats days under a week", () => {
    const d = new Date(Date.now() + 3 * DAY);
    expect(formatForecast(d)).toBe("3d");
  });

  it("formats weeks", () => {
    const d = new Date(Date.now() + 21 * DAY);
    expect(formatForecast(d)).toMatch(/~3w/);
  });

  it("formats months", () => {
    const d = new Date(Date.now() + 90 * DAY);
    expect(formatForecast(d)).toMatch(/~3mo/);
  });
});
