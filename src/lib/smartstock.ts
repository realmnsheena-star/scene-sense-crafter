export type ProductCategory =
  | "Switches"
  | "Protection"
  | "Wiring"
  | "Lighting"
  | "Fans"
  | "Accessories";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  stock: number;
};

export type Sale = { id: string; productId: string; quantity: number; date: string };
export type DemoData = { products: Product[]; sales: Sale[] };
export type StockStatus = "critical" | "warning" | "healthy";
export type ForecastMode = "basic" | "smart";

const PRODUCT_SEEDS: Array<Omit<Product, "stock"> & { dailyDemand: number; targetDays: number }> = [
  { id: "p-01", name: "Modular switch, 6A", category: "Switches", unitPrice: 85, dailyDemand: 6.2, targetDays: 4 },
  { id: "p-02", name: "MCB, single pole 16A", category: "Protection", unitPrice: 245, dailyDemand: 3.5, targetDays: 9 },
  { id: "p-03", name: "Copper wire roll, 1.5mm", category: "Wiring", unitPrice: 1650, dailyDemand: 1.1, targetDays: 22 },
  { id: "p-04", name: "LED bulb, 9W", category: "Lighting", unitPrice: 115, dailyDemand: 8.4, targetDays: 3 },
  { id: "p-05", name: "LED tube light, 20W", category: "Lighting", unitPrice: 385, dailyDemand: 2.8, targetDays: 12 },
  { id: "p-06", name: "Ceiling fan, 1200mm", category: "Fans", unitPrice: 2450, dailyDemand: 0.75, targetDays: 28 },
  { id: "p-07", name: "Extension board, 4-way", category: "Accessories", unitPrice: 425, dailyDemand: 1.8, targetDays: 17 },
  { id: "p-08", name: "MCB, double pole 32A", category: "Protection", unitPrice: 625, dailyDemand: 1.25, targetDays: 8 },
  { id: "p-09", name: "Modular socket, 16A", category: "Switches", unitPrice: 155, dailyDemand: 4.1, targetDays: 11 },
  { id: "p-10", name: "Copper wire roll, 2.5mm", category: "Wiring", unitPrice: 2580, dailyDemand: 0.85, targetDays: 6 },
  { id: "p-11", name: "LED panel light, 12W", category: "Lighting", unitPrice: 540, dailyDemand: 1.5, targetDays: 20 },
  { id: "p-12", name: "Miniature circuit breaker, 40A", category: "Protection", unitPrice: 780, dailyDemand: 0.65, targetDays: 30 },
];

export const CATEGORIES: ProductCategory[] = [
  "Switches",
  "Protection",
  "Wiring",
  "Lighting",
  "Fans",
  "Accessories",
];

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAverageDailySales(
  productId: string,
  sales: Sale[],
  asOf: string,
  days = 14,
): number {
  const end = new Date(`${asOf}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  const totals = new Map<string, number>();
  for (const sale of sales) {
    if (sale.productId === productId && sale.date >= formatDateKey(start) && sale.date <= asOf) {
      totals.set(sale.date, (totals.get(sale.date) ?? 0) + sale.quantity);
    }
  }
  return [...totals.values()].reduce((sum, quantity) => sum + quantity, 0) / days;
}

export function getWeekdayAverage(
  productId: string,
  sales: Sale[],
  weekday: number,
  asOf: string,
): number {
  const end = new Date(`${asOf}T12:00:00`);
  const firstDay = new Date(end);
  firstDay.setDate(firstDay.getDate() - 55);
  const startKey = formatDateKey(firstDay);
  const dailyTotals = new Map<string, number>();
  for (const sale of sales) {
    if (sale.productId === productId && sale.date >= startKey && sale.date <= asOf) {
      dailyTotals.set(sale.date, (dailyTotals.get(sale.date) ?? 0) + sale.quantity);
    }
  }
  let quantity = 0;
  let matchingDays = 0;
  for (let offset = 0; offset < 56; offset += 1) {
    const date = new Date(firstDay);
    date.setDate(date.getDate() + offset);
    if (date.getDay() === weekday) {
      quantity += dailyTotals.get(formatDateKey(date)) ?? 0;
      matchingDays += 1;
    }
  }
  return matchingDays === 0 ? 0 : quantity / matchingDays;
}

export function getDaysLeft(stock: number, averageDailySales: number): number {
  return averageDailySales <= 0 ? Number.POSITIVE_INFINITY : stock / averageDailySales;
}

export function getStockStatus(daysLeft: number, threshold: number): StockStatus {
  if (daysLeft < threshold) return "critical";
  if (daysLeft < threshold * 2) return "warning";
  return "healthy";
}

export function getReorderQuantity(forecastSales: number, stock: number): number {
  return Math.max(0, Math.ceil(forecastSales - stock));
}

export function getForecastDailyDemand(
  mode: ForecastMode,
  productId: string,
  sales: Sale[],
  date: string,
  asOf: string,
): number {
  if (mode === "basic") return getAverageDailySales(productId, sales, asOf);
  return getWeekdayAverage(productId, sales, new Date(`${date}T12:00:00`).getDay(), asOf);
}

export function createDemoData(now = new Date()): DemoData {
  const today = formatDateKey(now);
  const sales: Sale[] = [];
  const historyStart = new Date(now);
  historyStart.setDate(historyStart.getDate() - 89);

  for (const [productIndex, seed] of PRODUCT_SEEDS.entries()) {
    for (let day = 0; day < 90; day += 1) {
      const date = new Date(historyStart);
      date.setDate(date.getDate() + day);
      const weekday = date.getDay();
      const weekdayFactor = weekday === 6 ? 1.55 : weekday === 0 ? 0.52 : 0.92;
      const variation = 0.84 + ((day * 7 + productIndex * 11) % 9) * 0.04;
      const quantity = Math.max(0, Math.round(seed.dailyDemand * weekdayFactor * variation));
      if (quantity > 0) {
        sales.push({
          id: `${seed.id}-${day}`,
          productId: seed.id,
          quantity,
          date: formatDateKey(date),
        });
      }
    }
  }

  const products = PRODUCT_SEEDS.map((seed) => {
    const average = getAverageDailySales(seed.id, sales, today);
    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      unitPrice: seed.unitPrice,
      stock: Math.max(1, Math.round(average * seed.targetDays)),
    };
  });

  return { products, sales };
}