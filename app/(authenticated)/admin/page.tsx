"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminOrder = {
  id: string;
  payment_id: string | null;
  email: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  file_url: string | null;
  customization?: unknown;
};

const STATUS_OPTIONS = ["pending", "printing", "completed"] as const;
const ADMIN_EMAIL = "lyka.business.india@gmail.com";

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "printing":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

export default function AdminPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string>("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          setError("Failed to verify admin session.");
          return;
        }

        console.log(user?.email);

        const email = (user?.email ?? "").trim();
        setUserEmail(email);

        if (!email || email !== ADMIN_EMAIL) {
          setIsUnauthorized(true);
          return;
        }

        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Admin orders fetch error:", error);
          setError("Failed to load orders.");
          return;
        }

        setOrders((orders as AdminOrder[]) ?? []);
      } catch (err) {
        console.error("[Admin] Unexpected error:", err);
        setError("Something went wrong while loading admin panel.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const handleStatusChange = async (orderId: string, nextStatus: string) => {
    setUpdatingOrderId(orderId);

    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: nextStatus })
        .eq("id", orderId);

      if (updateError) {
        console.error("[Admin] Update status error:", updateError.message);
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: nextStatus,
              }
            : order
        )
      );
    } catch (err) {
      console.error("[Admin] Unexpected update error:", err);
    } finally {
      setUpdatingOrderId("");
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadDetails = (order: AdminOrder) => {
    try {
      const customization: any = order.customization || {};

      const material = String(customization.material ?? "");
      const color = String(customization.color ?? "");
      const finish = String(customization.finish ?? "");
      const scale = String(customization.scale ?? "");
      const quantity = String(customization.quantity ?? "");
      const sizeX = customization?.size?.x ?? "N/A";
      const sizeY = customization?.size?.y ?? "N/A";
      const sizeZ = customization?.size?.z ?? "N/A";

      const headers = [
        "order_id",
        "short_id",
        "email",
        "amount",
        "status",
        "material",
        "color",
        "finish",
        "scale",
        "quantity",
        "size_x",
        "size_y",
        "size_z",
        "created_at",
      ];

      const values = [
        order.id,
        "LYKA-" + order.id.slice(0, 6).toUpperCase(),
        order.email ?? "",
        order.amount ?? "",
        order.status ?? "",
        material,
        color,
        finish,
        scale,
        quantity,
        sizeX,
        sizeY,
        sizeZ,
        order.created_at ?? "",
      ];

      const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = `${headers.join(",")}\n${values.map(escapeCsv).join(",")}`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `order-${order.id.slice(0, 6)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      if (order.file_url) {
        window.open(order.file_url, "_blank");
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleViewCustomization = (order: AdminOrder) => {
    try {
      const customization =
        order.customization && typeof order.customization === "object"
          ? (order.customization as Record<string, unknown>)
          : {};

      const material = String(customization.material ?? "");
      const color = String(customization.color ?? "");
      const finish = String(customization.finish ?? "");
      const scale = String(customization.scale ?? "");
      const quantity = String(customization.quantity ?? "");

      const hasData = material || color || finish || scale || quantity;

      if (!hasData) {
        alert("No customization data");
        return;
      }

      alert(
        `Material: ${material || "-"}\nColor: ${color || "-"}\nFinish: ${finish || "-"}\nScale: ${scale || "-"}\nQuantity: ${quantity || "-"}`
      );
    } catch (err) {
      console.error("View customization failed:", err);
      alert("No customization data");
    }
  };

  const handleFullDownload = (order: AdminOrder) => {
    try {
      // Keep existing STL + CSV behavior centralized in the existing details handler.
      handleDownloadDetails(order);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="layerledger-content mx-auto max-w-5xl space-y-5">
        <section className="rounded-[24px] border border-black/10 bg-white/80 p-6 dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">Loading admin panel...</p>
        </section>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="layerledger-content mx-auto max-w-5xl space-y-5">
        <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-xl font-semibold text-red-200">Access denied</h1>
          <p className="mt-2 text-sm text-red-100/90">Only admin users can access this page.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="layerledger-content mx-auto max-w-5xl space-y-5">
      <section className="rounded-[24px] border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.08)] dark:border-white/10 dark:bg-slate-950/70">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500 dark:text-green-300">Admin</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Orders Management</h1>
      </section>

      {error ? (
        <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      {!error && orders.length === 0 ? (
        <section className="rounded-[24px] border border-black/10 bg-white/80 p-6 dark:border-white/10 dark:bg-slate-950/70">
          <p className="text-sm text-slate-600 dark:text-slate-300">No orders found.</p>
        </section>
      ) : null}

      {!error && orders.length > 0 ? (
        <section className="overflow-hidden rounded-[24px] border border-black/10 bg-white/80 dark:border-white/10 dark:bg-slate-950/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead className="border-b border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Order ID</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Created At</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">STL</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const stlUrl = order.file_url || null;

                  return (
                  <tr key={order.id} className="border-b border-black/5 last:border-b-0 dark:border-white/10">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {(() => {
                        const shortId = "LYKA-" + order.id.slice(0, 6).toUpperCase();
                        return (
                          <div>
                            <div className="font-semibold">{shortId}</div>
                            <div className="text-xs opacity-50">{order.id}</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-green-300">₹{Number(order.amount ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`mb-2 inline-block rounded px-2 py-1 text-xs text-white ${getStatusColor(order.status)}`}>
                        {order.status ?? "unknown"}
                      </span>
                      <select
                        value={order.status ?? "pending"}
                        onChange={(e) => void handleStatusChange(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2 mt-1">
                        {stlUrl ? (
                          <span className="text-green-400 text-sm">● STL Available</span>
                        ) : (
                          <span className="text-gray-400 text-sm">No STL</span>
                        )}
                        {stlUrl && (
                          <button
                            onClick={() => handleFullDownload(order)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            Download STL
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
