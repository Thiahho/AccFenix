// Mirror the order DTOs of api/src/AccFenix.Api/Endpoints/OrderEndpoints.cs and AdminOrderEndpoints.cs.

export type OrderStatus = "pending" | "confirmed" | "outForDelivery" | "delivered" | "cancelled";

export type DeliveryZone = "buenosAires" | "otherProvince";

export type CustomerType = "personal" | "business";

/** Body of `POST /api/orders`. It carries no prices: the server prices every line. Other-zone fields are left out. */
export type CreateOrderRequest = {
  zone: DeliveryZone;
  customerType: CustomerType;
  /** Required for a business; always null for a personal order. */
  businessName: string | null;
  customerName: string;
  phone: string;
  locality?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  province?: string;
  carrier?: string;
  comments?: string;
  items: { variantId: number; quantity: number }[];
};

export type OrderItem = {
  id: number;
  /** Null when the variant was deleted after the order was placed. */
  variantId: number | null;
  productName: string;
  sku: string;
  variantLabel: string;
  quantity: number;
  /** ARS snapshot taken when the order was placed; null means "price on request". */
  unitPrice: number | null;
  subtotal: number | null;
};

export type CreatedOrder = {
  id: number;
  number: number;
  status: OrderStatus;
  createdAt: string;
  isWholesale: boolean;
  /** Sum of the priced lines only; 0 when nothing is priced. */
  total: number;
  hasUnpricedItems: boolean;
  items: OrderItem[];
};
