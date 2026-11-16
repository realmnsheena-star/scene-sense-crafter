import { describe, expect, it } from "vitest";

import {
  createDemoData,
  getAverageDailySales,
  getDaysLeft,
  getReorderQuantity,
  getStockStatus,
  getWeekdayAverage,
  type Sale,
} from "@/lib/smartstock";

describe("SmartStock inventory rules", () => {
  it("averages sales across the most recent 14 calendar days", () => {
    const sales: Sale[] = [
      { id: "old", productId: "wire", quantity: 100, date: "2026-01-01" },
      { id: "one", productId: "wire", quantity: 28, date: "2026-01-18" },
      { id: "two", productId: "wire", quantity: 14, date: "2026-01-31" },
    ];
    expect(getAverageDailySales("wire", sales, "2026-01-31")).toBe(3);
  });

  it("calculates days of stock as stock divided by average daily sales", () => {
    expect(getDaysLeft(42, 6)).toBe(7);
  });

  it("classifies red below the alert threshold, yellow below twice it, and green otherwise", () => {
    expect(getStockStatus(6.99, 7)).toBe("critical");
    expect(getStockStatus(7, 7)).toBe("warning");
    expect(getStockStatus(14, 7)).toBe("healthy");
  });

  it("suggests 30-day forecast demand minus stock and never returns a negative order", () => {
    expect(getReorderQuantity(50, 20)).toBe(30);
    expect(getReorderQuantity(10, 20)).toBe(0);
  });

  it("uses weekday averages from the most recent eight weeks", () => {
    const sales: Sale[] = [];
    const anchor = new Date("2026-02-01T12:00:00");
    for (let offset = 0; offset < 56; offset += 1) {
      const date = new Date(anchor);
      date.setDate(date.getDate() - offset);
      if (date.getDay() === 6) {
        sales.push({ id: String(offset), productId: "wire", quantity: 8, date: date.toISOString().slice(0, 10) });
      }
    }
    expect(getWeekdayAverage("wire", sales, 6, "2026-02-01")).toBe(8);
  });

  it("starts with 12 products and 90 days of sales history", () => {
    const demo = createDemoData(new Date("2026-02-01T12:00:00"));
    expect(demo.products).toHaveLength(12);
    const dates = new Set(demo.sales.map((sale) => sale.date));
    expect(dates.size).toBe(90);
  });
});