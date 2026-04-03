"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  email: string;
  customer_email?: string | null;
  amount?: number | null;
  status?: string | null;
  created_at: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        // ✅ SAFE AUTH (NO LOCK ERROR)
        const { data: { session }, error: userError } = await supabase.auth.getSession();
        const user = session?.user;

        if (userError) {
          console.error("[My Orders] Auth error:", userError.message);
          setError("Unable to load user");
          return;
        }

        if (!user) {
          setError("User not logged in");
          return;
        }

        const userEmailValue = user.email || "";

        console.log("[My Orders] User:", userEmailValue);

        // ✅ FETCH FIX (handles both email fields)
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .or(`customer_email.eq.${userEmailValue},email.eq.${userEmailValue}`)
          .order("created_at", { ascending: false });

        if (fetchError) {
          console.error("[My Orders] Fetch error:", fetchError.message);
          setError("Failed to load orders");
          return;
        }

        console.log("[My Orders] Orders:", data);
        setOrders(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[My Orders] Unexpected:", message);
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-IN");
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "paid") return "bg-green-500/20 text-green-300 border-green-400/30";
    if (s === "completed") return "bg-blue-500/20 text-blue-300 border-blue-400/30";
    return "bg-yellow-500/20 text-yellow-300 border-yellow-400/30";
  };

  if (loading) {
    return (
      <div className="p-10 text-white text-center">Loading orders...</div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-16">
      <h1 className="text-3xl font-bold text-white">My Orders</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-400 p-4 text-red-300">
          {error}
        </div>
      )}

      {!error && orders.length === 0 && (
        <p className="text-gray-400">No orders found</p>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const amount = Number(order.amount ?? 0);
          const status = order.status || "pending";

          return (
            <div
              key={order.id}
              className="border border-white/10 p-5 rounded-xl bg-black/40"
            >
              <p className="text-white font-mono">
                Order ID: LYKA-{order.id.slice(0, 6).toUpperCase()}
              </p>

              <p className="text-green-400 mt-2">
                ₹{amount.toFixed(2)}
              </p>

              <p className="text-sm text-gray-300 mt-2">
                📞 {order.phone || "N/A"}
              </p>

              <p className="text-sm text-gray-300">
                📍 {order.address || "N/A"}
              </p>

              <p className="text-sm text-gray-300">
                {order.city || "N/A"}, {order.state || "N/A"} - {order.pincode || "N/A"}
              </p>

              <p className={`mt-2 inline-block px-3 py-1 text-xs border rounded ${getStatusBadgeColor(status)}`}>
                {status}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                {formatDate(order.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}