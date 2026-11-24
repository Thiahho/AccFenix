// Reflejan los DTOs de api/src/AccFenix.Api/Endpoints/AdminCatalogEndpoints.cs
import type { Availability, CaffeineLevel } from "@/lib/api";
import type { CustomerType, Fulfillment, OrderItem, OrderStatus, PaymentStatus } from "@/lib/orders/types";

export type AdminCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  attributeIds: number[];
  productCount: number;
};

export type AdminValue = { id: number; label: string; sortOrder: number; colorHex: string | null; addonPrice: number | null };

export type AdminAttribute = { id: number; name: string; slug: string; sortOrder: number; isAddon: boolean; values: AdminValue[] };

export type AdminProductSummary = {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  activeVariants: number;
  onRequestVariants: number;
  coverUrl: string | null;
};

export type AdminVariant = {
  id: number;
  sku: string;
  valueIds: number[];
  availability: Availability;
  isActive: boolean;
  retailPrice: number | null;
};

export type VariantPrices = { variantId: number; retailPrice: number | null };

export type AdminMedia = { id: number; type: "image" | "video"; url: string; attributeValueId: number | null; sortOrder: number };

export type AdminProduct = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  allowedValueIds: number[];
  categoryAttributes: AdminAttribute[];
  variants: AdminVariant[];
  media: AdminMedia[];
  intensity: number | null;
  caffeine: CaffeineLevel | null;
  sweetness: number | null;
  flavorNotes: string | null;
};

export type AdminSettings = { whatsappNumber: string; mercadoPagoAlias: string };

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// Mirror api/src/AccFenix.Api/Endpoints/AdminOrderEndpoints.cs
export type AdminOrderSummary = {
  id: number;
  number: number;
  createdAt: string;
  status: OrderStatus;
  customerType: CustomerType;
  customerName: string;
  /** Null for orders placed from the site: they arrive from the customer's WhatsApp, which carries the number. */
  phone: string | null;
  fulfillment: Fulfillment;
  timeSlot: string;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  total: number;
  hasUnpricedItems: boolean;
  itemCount: number;
  totalUnits: number;
};

export type AdminOrderPage = { total: number; page: number; pageSize: number; items: AdminOrderSummary[] };

export type AdminOrder = AdminOrderSummary & {
  address: string | null;
  comments: string | null;
  mercadoPagoPaymentId: string | null;
  items: OrderItem[];
  /** Secret of the customer's review link; it works once the order is paid. */
  reviewToken: string;
};
