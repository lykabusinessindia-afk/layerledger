"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NavItem = {
  label: string;
  icon?: string;
  href?: string;
  action?: () => Promise<void>;
};

const SHOW_ADVANCED_MENU = false;
const ADMIN_EMAIL = "lyka.business.india@gmail.com";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const isDev = process.env.NODE_ENV !== "production";
  const isAdminUser = userEmail.trim().toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (isDev) {
      setCheckingAuth(false);
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      if (isMounted) {
        setCheckingAuth(false);
      }
    }, 3000);

    const checkUser = async () => {
      try {
        await supabase.auth.getSession();
      } catch {
        // Auth lookup failure should not block page rendering.
      } finally {
        if (isMounted) {
          window.clearTimeout(timeoutId);
          setCheckingAuth(false);
        }
      }
    };

    checkUser();

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [isDev]);

  useEffect(() => {
    let isMounted = true;

    const syncUserEmail = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setUserEmail((user?.email ?? "").trim().toLowerCase());
      }
    };

    void syncUserEmail();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail((session?.user?.email ?? "").trim().toLowerCase());
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add("dark", "dark-theme");
    root.classList.remove("light-theme");
    document.body.classList.add("bg-[#020617]", "text-white");

    return () => {
      document.body.classList.remove("bg-[#020617]", "text-white");
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const renderDesktopNavLink = (item: NavItem) => {
    if (!item.href) {
      return null;
    }

    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const classes = `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-white/80 bg-white/5 border-white/10 backdrop-blur-lg transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] ${
      isActive
        ? "bg-gradient-to-r from-green-400/20 to-emerald-500/10 border border-green-400/30 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.35)]"
        : ""
    }`;

    return (
      <Link key={item.label} href={item.href} className={classes}>
        {item.icon ? <span aria-hidden>{item.icon}</span> : null}
        {item.label}
      </Link>
    );
  };

  const renderDesktopNavAction = (item: NavItem) => {
    if (!item.action) {
      return null;
    }

    const classes =
      "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 backdrop-blur-lg transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]";

    return (
      <button key={item.label} onClick={item.action} className={classes}>
        {item.label}
      </button>
    );
  };

  const renderMobileNavLink = (item: NavItem) => {
    if (!item.href) {
      return null;
    }

    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`rounded-xl border px-3 py-2 text-center text-xs font-medium transition-all duration-200 ${
          isActive
            ? "border-green-400/35 bg-green-500/15 text-green-300"
            : "border-white/8 bg-white/5 text-slate-200 hover:bg-white/10"
        }`}
      >
        {item.icon ? <span className="mr-1" aria-hidden>{item.icon}</span> : null}
        {item.label}
      </Link>
    );
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <div
      className="layerledger-dashboard dark-theme min-h-screen text-white relative overflow-x-hidden bg-[#020617]"
      data-theme="dark"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.11),_transparent_22%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 space-y-3 p-3 bg-[#020617]/90 backdrop-blur-2xl border-r border-white/10 shadow-[inset_0_0_60px_rgba(59,130,246,0.08)] lg:block">
        <div className="rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl shadow-[0_0_25px_rgba(59,130,246,0.25)] px-4 py-3">
          <p className="text-2xl font-black tracking-tight text-white">
            Layer<span className="text-green-400">Ledger</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Control Center</p>
        </div>

        <nav className="mt-8 space-y-2">
          {SHOW_ADVANCED_MENU && renderDesktopNavLink({ label: "Dashboard", href: "/dashboard" })}
          {renderDesktopNavLink({ label: "Upload STL", href: "/calculator" })}
          {renderDesktopNavLink({ label: "My Orders", icon: "📦", href: "/my-orders" })}
          {isAdminUser && renderDesktopNavLink({ label: "Admin", href: "/admin" })}
          {SHOW_ADVANCED_MENU &&
            renderDesktopNavLink({ label: "Seller Calculator", href: "/seller-calculator" })}
          {SHOW_ADVANCED_MENU && renderDesktopNavLink({ label: "Jobs", href: "/jobs" })}
          {SHOW_ADVANCED_MENU && renderDesktopNavLink({ label: "Settings", href: "/settings" })}
          {renderDesktopNavAction({ label: "Logout", action: handleLogout })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-black tracking-tight text-white">
            Layer<span className="text-green-400">Ledger</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-500/90 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHOW_ADVANCED_MENU && renderMobileNavLink({ label: "Dashboard", href: "/dashboard" })}
          {renderMobileNavLink({ label: "Upload STL", href: "/calculator" })}
          {renderMobileNavLink({ label: "My Orders", icon: "📦", href: "/my-orders" })}
          {isAdminUser && renderMobileNavLink({ label: "Admin", href: "/admin" })}
          {SHOW_ADVANCED_MENU &&
            renderMobileNavLink({ label: "Seller Calculator", href: "/seller-calculator" })}
          {SHOW_ADVANCED_MENU && renderMobileNavLink({ label: "Jobs", href: "/jobs" })}
          {SHOW_ADVANCED_MENU && renderMobileNavLink({ label: "Settings", href: "/settings" })}
        </nav>
      </header>

      <main className="relative px-4 py-6 sm:px-6 sm:py-8 lg:pl-[20rem] lg:pr-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
