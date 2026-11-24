// Mirror the order DTOs of api/src/AccFenix.Api/Endpoints/OrderEndpoints.cs and AdminOrderEndpoints.cs.

export type OrderStatus = "pending" | "confirmed" | "outForDelivery" | "delivered" | "cancelled";

export type PaymentStatus = "unpaid" | "approved" | "rejected" | "refunded";

export type CustomerType = "personal" | "business";

export type Fulfillment = "delivery" | "pickup";

/** Body of `POST /api/orders`. It carries no prices: the server prices every line. */
export type CreateOrderRequest = {
  fulfillment: Fulfillment;
  customerType: CustomerType;
  customerName: string;
  timeSlot: string;
  /** Required when `fulfillment` is "delivery". */
  address?: string;
  comments?: string;
  items: { variantId: number; quantity: number; addonValueIds?: number[] }[];
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
  paymentStatus: PaymentStatus;
  createdAt: string;
  /** Sum of the priced lines only; 0 when nothing is priced. */
  total: number;
  hasUnpricedItems: boolean;
  items: OrderItem[];
  /** Mercado Pago checkout link. Null when payments are not configured or the order has unpriced items. */
  checkoutUrl: string | null;
};

/** Body of `GET /api/orders/{number}/payment`: only the payment state, no customer data. */
export type OrderPayment = {
  number: number;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
};
