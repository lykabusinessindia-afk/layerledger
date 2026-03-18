"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NavItem = {
  label: string;
  href?: string;
  action?: () => Promise<void>;
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  type ThemeMode = "dark" | "light";

  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("layerledger-theme");
    const nextTheme: ThemeMode = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("layerledger-theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const navItems: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Upload STL", href: "/calculator" },
      { label: "Seller Calculator", href: "/seller-calculator" },
      { label: "Jobs", href: "/jobs" },
      { label: "Settings", href: "/settings" },
      { label: "Logout", action: handleLogout },
    ],
    []
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <div
      className={`layerledger-dashboard min-h-screen text-white relative overflow-x-hidden ${theme === "dark" ? "dark-theme" : "light-theme"}`}
      data-theme={theme}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_24%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.11),_transparent_22%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-slate-950/85 p-6 backdrop-blur-xl lg:block">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-2xl font-black tracking-tight text-white">
            Layer<span className="text-green-400">Ledger</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Control Center</p>
        </div>

        <button
          onClick={toggleTheme}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10"
        >
          {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const isActive = item.href
              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
              : false;

            const classes = `flex w-full items-center rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "border-green-400/35 bg-green-500/15 text-green-300 shadow-[0_0_40px_rgba(34,197,94,0.12)]"
                : "border-white/8 bg-white/5 text-slate-200 hover:bg-white/10"
            }`;

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={classes}>
                  {item.label}
                </Link>
              );
            }

            return (
              <button key={item.label} onClick={item.action} className={classes}>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-black tracking-tight text-white">
            Layer<span className="text-green-400">Ledger</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/10"
            >
              {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-500/90 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {navItems
            .filter((item) => item.href)
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href as string}
                  className={`rounded-xl border px-3 py-2 text-center text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "border-green-400/35 bg-green-500/15 text-green-300"
                      : "border-white/8 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </header>

      <main className="relative px-4 py-6 sm:px-6 sm:py-8 lg:pl-[20rem] lg:pr-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
