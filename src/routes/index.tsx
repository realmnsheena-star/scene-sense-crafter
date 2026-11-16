import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowRight,
  Boxes,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  CATEGORIES,
  createDemoData,
  formatDateKey,
  getAverageDailySales,
  getDaysLeft,
  getForecastDailyDemand,
  getReorderQuantity,
  getStockStatus,
  type DemoData,
  type ForecastMode,
  type Product,
  type ProductCategory,
  type Sale,
  type StockStatus,
} from "@/lib/smartstock";

const STORAGE_KEY = "smartstock-demo-v1";
const PAGE_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Boxes },
  { id: "sales", label: "Record sale", icon: ArrowDownUp },
  { id: "forecast", label: "Forecast", icon: ChartNoAxesCombined },
  { id: "reorder", label: "Reorder list", icon: ClipboardList },
] as const;
type PageId = (typeof PAGE_ITEMS)[number]["id"];
type ProductDraft = Pick<Product, "name" | "category" | "unitPrice" | "stock">;

function readSavedData(): DemoData {
  const seeded = createDemoData();
  if (typeof window === "undefined") return seeded;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seeded;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("products" in parsed) || !("sales" in parsed)) {
      return seeded;
    }
    const data = parsed as DemoData;
    if (!Array.isArray(data.products) || !Array.isArray(data.sales)) return seeded;
    return data;
  } catch {
    return seeded;
  }
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString(
    "en-IN",
    options ?? { day: "numeric", month: "short", year: "numeric" },
  );
}

function getAverage(productId: string, sales: Sale[]): number {
  return getAverageDailySales(productId, sales, formatDateKey(new Date()));
}

function statusLabel(status: StockStatus): string {
  if (status === "critical") return "Reorder now";
  if (status === "warning") return "Running low";
  return "Healthy";
}

function getStatusClass(status: StockStatus): string {
  return `status-${status}`;
}

function getSale(productId: string, sales: Sale[], daysAgo: number): number {
  const target = new Date();
  target.setDate(target.getDate() - daysAgo);
  const key = formatDateKey(target);
  return sales
    .filter((sale) => sale.productId === productId && sale.date === key)
    .reduce((sum, sale) => sum + sale.quantity, 0);
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Zap className="size-5 fill-current" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-[17px] font-bold tracking-tight">SmartStock</p>
          <p className="mt-1 text-[10px] text-sidebar-foreground/55">INVENTORY INTELLIGENCE</p>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-accent" /> {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Boxes;
  tone: "navy" | "red" | "amber" | "green";
}) {
  const toneClasses = {
    navy: "bg-primary/10 text-primary",
    red: "status-critical",
    amber: "status-warning",
    green: "status-healthy",
  };
  return (
    <Card className="rounded-lg border-border/80 shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">{detail}</p>
        </div>
        <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(status)}`}>
      <span className="size-1.5 rounded-full bg-current" /> {statusLabel(status)}
    </span>
  );
}

function ProductForm({
  initial,
  title,
  actionLabel,
  onSubmit,
}: {
  initial?: Product;
  title: string;
  actionLabel: string;
  onSubmit: (draft: ProductDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(initial?.category ?? "Lighting");
  const [unitPrice, setUnitPrice] = useState(String(initial?.unitPrice ?? ""));
  const [stock, setStock] = useState(String(initial?.stock ?? ""));
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || Number(unitPrice) <= 0 || Number(stock) < 0) {
      setError("Enter a name, a positive unit price, and a valid stock quantity.");
      return;
    }
    onSubmit({ name: name.trim(), category, unitPrice: Number(unitPrice), stock: Number(stock) });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Keep the product details and current on-hand quantity up to date.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="product-name">Product name</Label>
          <Input id="product-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Modular switch, 6A" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-category">Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ProductCategory)}>
            <SelectTrigger id="product-category"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product-price">Unit price (₹)</Label>
          <Input id="product-price" type="number" min="1" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} placeholder="125" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="product-stock">Current stock</Label>
          <Input id="product-stock" type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="24" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit"><Check />{actionLabel}</Button>
      </DialogFooter>
    </form>
  );
}

function DashboardView({
  products,
  sales,
  threshold,
  onOpenProducts,
}: {
  products: Product[];
  sales: Sale[];
  threshold: number;
  onOpenProducts: () => void;
}) {
  const stockRows = useMemo(() => products.map((product) => {
    const average = getAverage(product.id, sales);
    const daysLeft = getDaysLeft(product.stock, average);
    return { product, average, daysLeft, status: getStockStatus(daysLeft, threshold) };
  }), [products, sales, threshold]);
  const counts = {
    critical: stockRows.filter((row) => row.status === "critical").length,
    warning: stockRows.filter((row) => row.status === "warning").length,
    healthy: stockRows.filter((row) => row.status === "healthy").length,
  };
  const chartData = [...stockRows]
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map(({ product, daysLeft, status }) => ({
      name: product.name.replace(/,.*$/, "").replace(/\s+(light|roll|breaker)$/i, ""),
      days: Math.min(45, Math.round(daysLeft * 10) / 10),
      fill: status === "critical" ? "var(--status-critical)" : status === "warning" ? "var(--status-warning)" : "var(--status-healthy)",
    }));
  const recentSales = [...sales].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? "Removed product";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Inventory overview"
        title="Good morning, team"
        description="Here’s the stock picture for your electrical supplies today."
        action={
          <Button variant="outline" onClick={onOpenProducts}><Boxes /> View products <ArrowRight /></Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total products" value={products.length} detail="Items in your catalogue" icon={Boxes} tone="navy" />
        <MetricCard label="Reorder now" value={counts.critical} detail="Below alert threshold" icon={AlertTriangle} tone="red" />
        <MetricCard label="Running low" value={counts.warning} detail="Less than two weeks of stock" icon={Activity} tone="amber" />
        <MetricCard label="Healthy stock" value={counts.healthy} detail="Two weeks or more on hand" icon={ShieldCheck} tone="green" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,0.8fr)]">
        <Card className="rounded-lg border-border/80 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold">Days of stock remaining</h2><p className="mt-1 text-xs text-muted-foreground">Based on the last 14 days of average sales</p></div>
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground"><span className="size-2 rounded-full bg-status-critical" /> Alert threshold: {threshold} days</span>
            </div>
            <div className="h-[260px] w-full" role="img" aria-label="Bar chart showing days of stock remaining per product">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, left: 5, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 4" />
                  <XAxis type="number" domain={[0, 45]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis dataKey="name" type="category" width={112} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip formatter={(value) => [`${value} days`, "Stock left"]} contentStyle={{ borderRadius: 8, borderColor: "var(--border)", fontSize: 12 }} />
                  <ReferenceLine x={threshold} stroke="var(--status-critical)" strokeDasharray="4 4" />
                  <ComposedChart />
                  <Line dataKey="days" type="monotone" stroke="var(--chart-1)" strokeWidth={0} dot={{ r: 5, strokeWidth: 2, fill: "var(--background)", stroke: "var(--chart-1)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-2 grid grid-cols-3 gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-status-critical" />Reorder now</span>
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-status-warning" />Running low</span>
              <span><span className="mr-1.5 inline-block size-2 rounded-full bg-status-healthy" />Healthy</span>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border/80 shadow-none">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div><h2 className="font-semibold">Recent sales</h2><p className="mt-1 text-xs text-muted-foreground">Latest stock movements</p></div>
              <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><TrendingDown className="size-4" /></span>
            </div>
            <div className="space-y-0">
              {recentSales.map((sale, index) => (
                <div key={sale.id} className={`flex items-center justify-between gap-3 py-3 ${index < recentSales.length - 1 ? "border-b border-border/70" : ""}`}>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{productName(sale.productId)}</p><p className="mt-1 text-[11px] text-muted-foreground">{dateLabel(sale.date, { day: "numeric", month: "short" })}</p></div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold">−{sale.quantity}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-border pt-3">
              <p className="mb-3 text-[10px] font-semibold uppercase text-muted-foreground">Stock needs attention</p>
              {stockRows.filter((row) => row.status !== "healthy").sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3).map(({ product, status, daysLeft }) => (
                <div key={product.id} className="flex items-center justify-between gap-2 py-1.5 text-xs"><span className="truncate">{product.name}</span><span className={`shrink-0 font-semibold ${status === "critical" ? "text-status-critical" : "text-status-warning"}`}>{Math.floor(daysLeft)}d</span></div>
              ))}
              {counts.critical + counts.warning === 0 && <p className="text-xs text-muted-foreground">All products are stocked for now.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-lg border-border/80 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Stock health by product</h2><p className="mt-1 text-xs text-muted-foreground">Live stock levels against average daily sales</p></div><Badge variant="secondary" className="font-normal">12 stocked items</Badge></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-xs">
              <thead><tr className="border-b border-border text-[10px] font-medium uppercase text-muted-foreground"><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Category</th><th className="pb-3 pr-4 text-right">In stock</th><th className="pb-3 pr-4 text-right">Avg. daily sales</th><th className="pb-3 pr-4 text-right">Days left</th><th className="pb-3">Status</th></tr></thead>
              <tbody>{stockRows.map(({ product, average, daysLeft, status }) => <tr key={product.id} className="border-b border-border/60 last:border-0"><td className="py-3 pr-4 font-medium">{product.name}</td><td className="py-3 pr-4 text-muted-foreground">{product.category}</td><td className="py-3 pr-4 text-right tabular-nums">{product.stock}</td><td className="py-3 pr-4 text-right tabular-nums">{average.toFixed(1)}</td><td className="py-3 pr-4 text-right tabular-nums">{Number.isFinite(daysLeft) ? Math.floor(daysLeft) : "∞"}</td><td className="py-3"><StatusPill status={status} /></td></tr>)}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductsView({
  products,
  sales,
  threshold,
  onAdd,
  onEdit,
  onDelete,
  onAddStock,
}: {
  products: Product[];
  sales: Sale[];
  threshold: number;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddStock: (product: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()) &&
    (category === "all" || product.category === category),
  );
  return (
    <div>
      <SectionHeader eyebrow="Catalogue" title="Products" description="Manage stock, product details, and incoming goods." action={<Button onClick={onAdd}><Plus /> Add product</Button>} />
      <Card className="rounded-lg border-border/80 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" aria-label="Search products" placeholder="Search products..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Select value={category} onValueChange={setCategory}><SelectTrigger className="sm:w-48" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Badge variant="secondary" className="h-9 justify-center px-3 font-normal">{filtered.length} products</Badge>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs">
            <thead><tr className="border-b border-border text-[10px] uppercase text-muted-foreground"><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Category</th><th className="pb-3 pr-4 text-right">Unit price</th><th className="pb-3 pr-4 text-right">On hand</th><th className="pb-3 pr-4 text-right">Days left</th><th className="pb-3 pr-4">Status</th><th className="pb-3 text-right">Actions</th></tr></thead>
            <tbody>{filtered.map((product) => { const days = getDaysLeft(product.stock, getAverage(product.id, sales)); const status = getStockStatus(days, threshold); return <tr key={product.id} className="border-b border-border/60 last:border-0"><td className="py-3.5 pr-4 font-medium">{product.name}</td><td className="py-3.5 pr-4 text-muted-foreground">{product.category}</td><td className="py-3.5 pr-4 text-right tabular-nums">{money(product.unitPrice)}</td><td className="py-3.5 pr-4 text-right font-medium tabular-nums">{product.stock}</td><td className="py-3.5 pr-4 text-right tabular-nums">{Number.isFinite(days) ? `${Math.floor(days)} days` : "∞"}</td><td className="py-3.5 pr-4"><StatusPill status={status} /></td><td className="py-2.5"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label={`Add stock to ${product.name}`} onClick={() => onAddStock(product)}><PackagePlus /></Button><Button variant="ghost" size="icon" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${product.name}`} onClick={() => onDelete(product)}><Trash2 /></Button></div></td></tr>; })}</tbody>
          </table></div>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No products match your search.</p>}
        </CardContent>
      </Card>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CircleHelp className="size-4" />Adding incoming goods updates stock without changing sales history.</div>
    </div>
  );
}

function SalesView({ products, sales, onRecord }: { products: Product[]; sales: Sale[]; onRecord: (productId: string, quantity: number, date: string) => void }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(formatDateKey(new Date()));
  const [error, setError] = useState("");
  const selectedProduct = products.find((product) => product.id === productId);
  const recent = [...sales].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 10);
  const productName = (id: string) => products.find((product) => product.id === id)?.name ?? "Removed product";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!selectedProduct || !Number.isInteger(amount) || amount < 1) {
      setError("Choose a product and enter a whole-number quantity greater than zero.");
      return;
    }
    if (amount > selectedProduct.stock) {
      setError(`Only ${selectedProduct.stock} units are in stock. Adjust the sale quantity.`);
      return;
    }
    onRecord(productId, amount, date);
    setQuantity("");
    setError("");
  }

  return (
    <div>
      <SectionHeader eyebrow="Stock movement" title="Record a sale" description="Log an order and update on-hand inventory in one step." />
      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.3fr)]">
        <Card className="h-fit rounded-lg border-border/80 shadow-none"><CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="font-semibold">Sale details</h2><p className="mt-1 text-xs text-muted-foreground">Stock decreases when this sale is saved.</p></div><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><ArrowDownUp className="size-4" /></span></div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="sale-product">Product</Label><Select value={productId} onValueChange={(value) => { setProductId(value); setError(""); }}><SelectTrigger id="sale-product"><SelectValue placeholder="Choose a product" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name} · {product.stock} in stock</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="sale-quantity">Quantity sold</Label><Input id="sale-quantity" type="number" min="1" max={selectedProduct?.stock ?? undefined} step="1" placeholder="Enter quantity" value={quantity} onChange={(event) => { setQuantity(event.target.value); setError(""); }} />{selectedProduct && <p className="text-[11px] text-muted-foreground">Available to sell: {selectedProduct.stock} units</p>}</div>
            <div className="space-y-1.5"><Label htmlFor="sale-date">Sale date</Label><Input id="sale-date" type="date" max={formatDateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full"><Check /> Save sale</Button>
          </form>
        </CardContent></Card>
        <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Recent sales</h2><p className="mt-1 text-xs text-muted-foreground">The last 10 recorded stock movements</p></div><Badge variant="secondary" className="font-normal">{recent.length} records</Badge></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-left text-xs"><thead><tr className="border-b border-border text-[10px] uppercase text-muted-foreground"><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4 text-right">Quantity</th><th className="pb-3 text-right">Stock on hand</th></tr></thead><tbody>{recent.map((sale) => { const product = products.find((item) => item.id === sale.productId); return <tr key={sale.id} className="border-b border-border/60 last:border-0"><td className="py-3.5 pr-4 font-medium">{productName(sale.productId)}</td><td className="py-3.5 pr-4 text-muted-foreground">{dateLabel(sale.date)}</td><td className="py-3.5 pr-4 text-right tabular-nums">−{sale.quantity}</td><td className="py-3.5 text-right tabular-nums">{product?.stock ?? "—"}</td></tr>; })}</tbody></table></div>
          {recent.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No sales recorded yet.</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}

function ForecastView({ products, sales }: { products: Product[]; sales: Sale[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [mode, setMode] = useState<ForecastMode>("smart");
  const selected = products.find((product) => product.id === productId);
  const today = formatDateKey(new Date());
  const history = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const offset = 29 - index;
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const dateKey = formatDateKey(date);
    return { label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), actual: getSale(productId, sales, offset), forecast: null as number | null, period: dateKey };
  }), [productId, sales]);
  const forecastData = useMemo(() => {
    let stock = selected?.stock ?? 0;
    const rows = [...history];
    let stockoutDay: number | null = null;
    let totalForecast = 0;
    for (let offset = 1; offset <= 14; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      const dateKey = formatDateKey(date);
      const dailyDemand = getForecastDailyDemand(mode, productId, sales, dateKey, today);
      totalForecast += dailyDemand;
      stock -= dailyDemand;
      if (stock <= 0 && stockoutDay === null) stockoutDay = offset;
      rows.push({
        label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        actual: null,
        forecast: Math.max(0, Math.round(dailyDemand * 10) / 10),
        period: dateKey,
      });
    }
    const reorderForecast = Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index + 1);
      return getForecastDailyDemand(mode, productId, sales, formatDateKey(date), today);
    }).reduce((sum, amount) => sum + amount, 0);
    return { rows, stockoutDay, totalForecast, reorderQty: getReorderQuantity(reorderForecast, selected?.stock ?? 0) };
  }, [history, mode, productId, sales, selected?.stock, today]);
  const average = getAverage(productId, sales);
  const stockout = forecastData.stockoutDay ?? getDaysLeft(selected?.stock ?? 0, average);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Demand planning" title="Sales forecast" description="Compare recent demand with an upcoming 14-day outlook." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-72"><Select value={productId} onValueChange={setProductId}><SelectTrigger aria-label="Select product"><SelectValue /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-border bg-card p-1"><Button variant={mode === "basic" ? "default" : "ghost"} size="sm" onClick={() => setMode("basic")}>Basic average</Button><Button variant={mode === "smart" ? "default" : "ghost"} size="sm" onClick={() => setMode("smart")}><Zap /> Smart forecast</Button></div>
      </div>
      {selected && <>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Current stock" value={selected.stock} detail={selected.name} icon={Boxes} tone="navy" />
          <MetricCard label="Predicted stockout" value={Number.isFinite(stockout) ? `${Math.floor(stockout)} days` : "No stockout"} detail={mode === "smart" ? "Based on weekday sales patterns" : "Based on the last 14 days"} icon={TrendingDown} tone={Number.isFinite(stockout) && stockout < 14 ? "red" : "green"} />
          <MetricCard label="Suggested reorder" value={forecastData.reorderQty} detail="Units for the next 30 days" icon={PackagePlus} tone="amber" />
        </div>
        <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 text-xs text-muted-foreground">30-day sales history · 14-day demand forecast</p></div><Badge variant="secondary" className="font-normal">{mode === "smart" ? "Weekday pattern" : "Basic average"}</Badge></div>
          <div className="h-[330px] w-full" role="img" aria-label="Line chart of 30 days of sales and 14 day forecast">
            <ResponsiveContainer width="100%" height="100%"><ComposedChart data={forecastData.rows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={22} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={dateLabel(today, { day: "numeric", month: "short" })} stroke="var(--muted-foreground)" strokeDasharray="3 4" />
              <Line name="Sales" dataKey="actual" type="monotone" connectNulls={false} stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              <Line name="Forecast" dataKey="forecast" type="monotone" connectNulls stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 2, fill: "var(--chart-2)", strokeWidth: 0 }} />
            </ComposedChart></ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground"><span>Avg. daily demand: <strong className="font-semibold text-foreground">{average.toFixed(1)} units</strong></span><span>14-day forecast: <strong className="font-semibold text-foreground">{forecastData.totalForecast.toFixed(1)} units</strong></span><span>On hand: <strong className="font-semibold text-foreground">{selected.stock} units</strong></span></div>
        </CardContent></Card>
      </>}
    </div>
  );
}

function ReorderView({ products, sales, threshold, setThreshold, onOpenProducts }: { products: Product[]; sales: Sale[]; threshold: number; setThreshold: (value: number) => void; onOpenProducts: () => void }) {
  const rows = products.map((product) => {
    const average = getAverage(product.id, sales);
    const daysLeft = getDaysLeft(product.stock, average);
    const status = getStockStatus(daysLeft, threshold);
    const quantity = getReorderQuantity(average * 30, product.stock);
    return { product, average, daysLeft, status, quantity, cost: quantity * product.unitPrice };
  }).filter((row) => row.status !== "healthy").sort((a, b) => a.daysLeft - b.daysLeft);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  function downloadCsv() {
    const header = ["Product", "Category", "In stock", "Avg daily sales", "Days left", "Order quantity", "Unit price", "Estimated cost", "Status"];
    const lines = rows.map(({ product, average, daysLeft, quantity, cost, status }) => [product.name, product.category, product.stock, average.toFixed(2), Number.isFinite(daysLeft) ? daysLeft.toFixed(1) : "infinity", quantity, product.unitPrice, cost, statusLabel(status)].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "smartstock-reorder-list.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Reorder list downloaded.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Purchasing" title="Reorder list" description="Products below your alert threshold, with suggested 30-day order quantities." action={<Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}><ArrowDownToLine /> Download CSV</Button>} />
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-sm"><div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Alert threshold</h2></div><p className="mt-1 text-xs text-muted-foreground">Show products expected to have less stock than your chosen days.</p></div>
        <div className="flex w-full items-center gap-4 sm:max-w-xs"><Slider aria-label="Alert threshold in days" min={3} max={30} step={1} value={[threshold]} onValueChange={(value) => { const next = value[0]; if (next !== undefined) setThreshold(next); }} /><span className="min-w-16 rounded-md border border-border px-3 py-2 text-center text-sm font-semibold tabular-nums">{threshold} days</span></div>
      </CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Products to reorder" value={rows.length} detail={`Below your ${threshold}-day threshold`} icon={AlertTriangle} tone={rows.length > 0 ? "red" : "green"} /><MetricCard label="Suggested units" value={rows.reduce((sum, row) => sum + row.quantity, 0)} detail="To cover the next 30 days" icon={PackagePlus} tone="navy" /><MetricCard label="Estimated order cost" value={money(totalCost)} detail="Based on unit prices on file" icon={TrendingUp} tone="amber" /></div>
      <Card className="rounded-lg border-border/80 shadow-none"><CardContent className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold">Recommended orders</h2><p className="mt-1 text-xs text-muted-foreground">Sorted by lowest stock cover first</p></div><Badge variant="secondary" className="font-normal">{rows.length} items</Badge></div>
        {rows.length > 0 ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-border text-[10px] uppercase text-muted-foreground"><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Status</th><th className="pb-3 pr-4 text-right">In stock</th><th className="pb-3 pr-4 text-right">Days left</th><th className="pb-3 pr-4 text-right">Suggested order</th><th className="pb-3 pr-4 text-right">Unit price</th><th className="pb-3 text-right">Estimated cost</th></tr></thead><tbody>{rows.map(({ product, status, daysLeft, quantity, cost }) => <tr key={product.id} className="border-b border-border/60 last:border-0"><td className="py-4 pr-4 font-medium">{product.name}<p className="mt-1 text-[10px] font-normal text-muted-foreground">{product.category}</p></td><td className="py-4 pr-4"><StatusPill status={status} /></td><td className="py-4 pr-4 text-right tabular-nums">{product.stock}</td><td className="py-4 pr-4 text-right tabular-nums">{Number.isFinite(daysLeft) ? daysLeft.toFixed(1) : "∞"}</td><td className="py-4 pr-4 text-right font-semibold tabular-nums">{quantity}</td><td className="py-4 pr-4 text-right tabular-nums">{money(product.unitPrice)}</td><td className="py-4 text-right font-semibold tabular-nums">{money(cost)}</td></tr>)}</tbody></table></div> : <div className="flex flex-col items-center py-12 text-center"><span className="grid size-12 place-items-center rounded-full bg-status-healthy"><Check className="size-5" /></span><h3 className="mt-4 font-semibold">You’re well stocked</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">No products are below the {threshold}-day alert threshold.</p><Button className="mt-4" variant="outline" onClick={onOpenProducts}>View products</Button></div>}
      </CardContent></Card>
    </div>
  );
}

function Index() {
  const [data, setData] = useState<DemoData>(() => createDemoData());
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [threshold, setThreshold] = useState(7);
  const [showNav, setShowNav] = useState(false);
  const [productDialog, setProductDialog] = useState<"add" | "edit" | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");

  useEffect(() => {
    setData(readSavedData());
    const storedThreshold = window.localStorage.getItem(`${STORAGE_KEY}-threshold`);
    if (storedThreshold) {
      const value = Number(storedThreshold);
      if (Number.isInteger(value) && value >= 3 && value <= 30) setThreshold(value);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(`${STORAGE_KEY}-threshold`, String(threshold));
  }, [ready, threshold]);

  const pageTitle = PAGE_ITEMS.find((item) => item.id === page)?.label ?? "Dashboard";

  function saveProduct(draft: ProductDraft) {
    if (productDialog === "edit" && editingProduct) {
      setData((current) => ({ ...current, products: current.products.map((product) => product.id === editingProduct.id ? { ...product, ...draft } : product) }));
      toast.success("Product details updated.");
    } else {
      setData((current) => ({ ...current, products: [...current.products, { ...draft, id: `product-${Date.now()}` }] }));
      toast.success("Product added.");
    }
    setProductDialog(null);
    setEditingProduct(null);
  }

  function addStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(stockQuantity);
    if (!stockProduct || !Number.isInteger(amount) || amount < 1) return;
    setData((current) => ({ ...current, products: current.products.map((product) => product.id === stockProduct.id ? { ...product, stock: product.stock + amount } : product) }));
    toast.success(`${amount} units added to ${stockProduct.name}.`);
    setStockProduct(null);
    setStockQuantity("");
  }

  function recordSale(productId: string, quantity: number, date: string) {
    setData((current) => {
      const product = current.products.find((item) => item.id === productId);
      if (!product || quantity > product.stock) return current;
      return {
        products: current.products.map((item) => item.id === productId ? { ...item, stock: item.stock - quantity } : item),
        sales: [...current.sales, { id: `sale-${Date.now()}`, productId, quantity, date }],
      };
    });
    toast.success("Sale recorded and stock updated.");
  }

  function resetDemo() {
    setData(createDemoData());
    setThreshold(7);
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(`${STORAGE_KEY}-threshold`);
    toast.success("Demo data restored.");
  }

  function goTo(next: PageId) {
    setPage(next);
    setShowNav(false);
  }

  return (
    <div className="app-shell flex bg-background">
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-sidebar-border transition-transform duration-200 lg:static lg:translate-x-0 ${showNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-sidebar-border px-5 py-5"><BrandMark /></div>
        <div className="px-4 pt-6"><p className="mb-3 px-2 text-[10px] font-semibold uppercase text-sidebar-foreground/45">Workspace</p><nav className="space-y-1" aria-label="Main navigation">{PAGE_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={page === id ? "page" : undefined} onClick={() => goTo(id)} className={`app-nav-item flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm ${page === id ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"}`}><Icon className="size-[17px]" /><span>{label}</span>{id === "reorder" && <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">{data.products.filter((product) => getStockStatus(getDaysLeft(product.stock, getAverage(product.id, data.sales)), threshold) !== "healthy").length}</span>}</button>)}</nav></div>
        <div className="mt-auto space-y-4 p-4">
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/55 p-3.5"><div className="flex items-center gap-2 text-xs font-medium"><span className="grid size-7 place-items-center rounded-md bg-sidebar-primary/15 text-sidebar-primary"><Gauge className="size-3.5" /></span>Forecast mode</div><p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/55">Weekday-aware demand planning is active.</p></div>
          <div className="flex items-center gap-3 border-t border-sidebar-border px-1 pt-4"><div className="grid size-9 place-items-center rounded-full bg-sidebar-primary/15 text-xs font-semibold text-sidebar-primary">SD</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Store demo</p><p className="mt-0.5 text-[10px] text-sidebar-foreground/50">Electrical supplies</p></div><Button variant="ghost" size="icon" title="Reset demo data" aria-label="Reset demo data" onClick={resetDemo}><RotateCcw /></Button></div>
        </div>
      </aside>
      {showNav && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-20 bg-foreground/30 lg:hidden" onClick={() => setShowNav(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-[62px] items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setShowNav(true)}><Menu /></Button><div className="hidden sm:block"><p className="text-[10px] font-medium uppercase text-muted-foreground">SmartStock / {pageTitle}</p><p className="mt-1 text-sm font-semibold">{pageTitle}</p></div><div className="sm:hidden"><BrandMark compact /></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground md:inline">{dateLabel(formatDateKey(new Date()), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span><span className="hidden h-5 w-px bg-border md:block" /><div className="flex items-center gap-2"><span className="relative grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"><span className="absolute right-0 top-0 size-2 rounded-full border-2 border-card bg-status-healthy" /><span className="text-[10px] font-semibold">SD</span></span><span className="hidden text-xs font-medium sm:inline">Store demo</span><ChevronDown className="hidden size-3 text-muted-foreground sm:block" /></div></div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] flex-1 p-4 sm:p-6 lg:p-8">
          {page === "dashboard" && <DashboardView products={data.products} sales={data.sales} threshold={threshold} onOpenProducts={() => goTo("products")} />}
          {page === "products" && <ProductsView products={data.products} sales={data.sales} threshold={threshold} onAdd={() => { setEditingProduct(null); setProductDialog("add"); }} onEdit={(product) => { setEditingProduct(product); setProductDialog("edit"); }} onDelete={setProductToDelete} onAddStock={setStockProduct} />}
          {page === "sales" && <SalesView products={data.products} sales={data.sales} onRecord={recordSale} />}
          {page === "forecast" && <ForecastView products={data.products} sales={data.sales} />}
          {page === "reorder" && <ReorderView products={data.products} sales={data.sales} threshold={threshold} setThreshold={setThreshold} onOpenProducts={() => goTo("products")} />}
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><span>SmartStock inventory workspace</span><span>Forecasts use recorded sales and current stock</span></footer>
        </main>
      </div>

      <Dialog open={productDialog !== null} onOpenChange={(open) => { if (!open) { setProductDialog(null); setEditingProduct(null); } }}><DialogContent><ProductForm key={`${productDialog}-${editingProduct?.id ?? "new"}`} initial={editingProduct ?? undefined} title={productDialog === "edit" ? "Edit product" : "Add product"} actionLabel={productDialog === "edit" ? "Save changes" : "Add product"} onSubmit={saveProduct} /></DialogContent></Dialog>
      <Dialog open={productToDelete !== null} onOpenChange={(open) => { if (!open) setProductToDelete(null); }}><DialogContent><DialogHeader><DialogTitle>Delete product?</DialogTitle><DialogDescription>{productToDelete ? `“${productToDelete.name}” will be removed from your inventory. Its saved sales history will remain.` : "This product will be removed from your inventory."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setProductToDelete(null)}>Cancel</Button><Button variant="destructive" onClick={() => { if (!productToDelete) return; setData((current) => ({ ...current, products: current.products.filter((product) => product.id !== productToDelete.id) })); toast.success("Product deleted."); setProductToDelete(null); }}>Delete product</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={stockProduct !== null} onOpenChange={(open) => { if (!open) { setStockProduct(null); setStockQuantity(""); } }}><DialogContent><form onSubmit={addStock} className="space-y-4"><DialogHeader><DialogTitle>Add incoming stock</DialogTitle><DialogDescription>{stockProduct ? `${stockProduct.name} · ${stockProduct.stock} units currently on hand` : "Record newly arrived goods."}</DialogDescription></DialogHeader><div className="space-y-1.5"><Label htmlFor="incoming-quantity">Units received</Label><Input id="incoming-quantity" type="number" min="1" step="1" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} placeholder="Enter quantity" required /></div><DialogFooter><Button type="submit"><PackagePlus /> Add to stock</Button></DialogFooter></form></DialogContent></Dialog>
      <span className="sr-only">{ready ? "Demo data is ready" : "Loading demo data"}</span>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartStock Dashboard | Electrical Inventory Forecasting" },
      { name: "description", content: "Manage electrical products, track stock, forecast sales, and plan reorders with SmartStock." },
      { property: "og:title", content: "SmartStock Dashboard | Electrical Inventory Forecasting" },
      { property: "og:description", content: "Manage electrical products, track stock, forecast sales, and plan reorders with SmartStock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});