"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/stores/cart";

/** While the payment is still being confirmed, asks the server again every few seconds (a bounded number of times). */
export function PaymentPoller({ everyMs = 5000, times = 24 }: { everyMs?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let runs = 0;
    const id = setInterval(() => {
      runs++;
      router.refresh();
      if (runs >= times) clearInterval(id);
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs, times]);
  return null;
}

/** The cart is emptied only once the payment is in; a rejected payment keeps the products for another try. */
export function ClearCartOnPaid() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}
