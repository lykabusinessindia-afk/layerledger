"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  email: string;
  customer_email?: string | null;
  payment_id: string;
  amount?: number | null;
  status?: string | null;
  order_status: string;
  created_at: string;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error("[My Orders] User auth error:", userError.message);
          setError("Unable to load user information");
          setLoading(false);
          return;
        }

        if (!user?.email) {
          console.log("[My Orders] User not logged in");
          setError("User not logged in");
          setLoading(false);
          return;
        }

        const userEmailValue = user.email;
        console.log("[My Orders] User email:", userEmailValue);

        // Fetch orders for this user
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .or(`email.eq.${userEmailValue},customer_email.eq.${userEmailValue}`)
          .order("created_at", { ascending: false });

        if (fetchError) {
          console.error("[My Orders] Supabase error:", fetchError.message);
          setError("Failed to load orders");
          setLoading(false);
          return;
        }

        console.log("Fetched Orders:", data);
        console.log("[My Orders] Orders fetched successfully:", data?.length || 0);
        setOrders(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[My Orders] Unexpected error:", message);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const normalizedStatus = (status || "pending").toLowerCase();
    if (normalizedStatus === "paid") {
      return "bg-green-500/20 text-green-300 border-green-400/30";
    }
    if (normalizedStatus === "completed") {
      return "bg-blue-500/20 text-blue-300 border-blue-400/30";
    }
    return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30";
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-6 py-16">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8">
          <p className="text-center text-white">Loading orders...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-16">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <h1 className="text-4xl font-black text-white">My Orders</h1>
        <p className="mt-2 text-slate-400">View all your print orders</p>
      </section>

      {error && (
        <section className="rounded-[24px] border border-red-400/30 bg-red-500/10 p-6">
          <p className="text-red-300">{error}</p>
        </section>
      )}

      {!error && orders.length === 0 ? (
        <section className="rounded-[24px] border border-white/10 bg-slate-950/70 p-12 text-center">
          <p className="text-lg font-semibold text-slate-400">No orders yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Your orders will appear here once you complete your first purchase.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderEmail = order.customer_email || order.email;
            console.log("[My Orders] Row:", { ...order, orderEmail });
            const amount = Number(order.amount ?? 0);
            const orderStatus = order.status || order.order_status || "pending";

            return (
              <section
                key={order.id}
                className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all hover:border-green-400/30 hover:shadow-[0_20px_60px_rgba(34,197,94,0.15)]"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Order ID
                    </p>
                    <p className="mt-2 font-mono text-sm text-slate-200">
                      {order.id ? `Order ID: LYKA-${order.id.slice(0, 6).toUpperCase()}` : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Amount
                    </p>
                    <p className="mt-2 text-lg font-bold text-green-400">
                      ₹{Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </p>
                    <p className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeColor(orderStatus)}`}>
                      {orderStatus || "Pending"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Date
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
