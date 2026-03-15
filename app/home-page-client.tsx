"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function HomePageClient() {
  const router = useRouter();

  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setShowLogin(false);
        setLoading(true);

        setTimeout(() => {
          router.push("/calculator");
        }, 800);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleEmailLogin = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/calculator`,
      },
    });

    setAuthLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for login link 🚀");
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);

    const oauthPath = "/api/auth/signin/google";
    const topWindow = window.top;

    if (topWindow && topWindow !== window.self) {
      topWindow.location.href = oauthPath;
      return;
    }

    window.location.href = oauthPath;
  };

  const handleLaunchCalculator = async () => {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      router.push("/calculator");
    } else {
      setShowLogin(true);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07111f] text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.12),_transparent_22%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:36px_36px]" />

      <section className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-green-300 shadow-lg shadow-black/20">
            3D Printing Pricing, Simplified
          </div>

          <h1 className="mt-8 text-6xl md:text-8xl font-black tracking-tight leading-none">
            LayerLedger
          </h1>

          <p className="mt-6 text-2xl md:text-4xl font-semibold text-white/90 max-w-4xl mx-auto leading-tight">
            Turn Every 3D Print Into Predictable Profit
          </p>

          <p className="mt-6 text-base md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            LayerLedger analyzes your 3D models, estimates filament, print time, printer fit, and cost breakdowns automatically so you can quote jobs faster and price with confidence.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLaunchCalculator}
              className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-8 py-4 text-lg font-semibold text-black shadow-[0_12px_40px_rgba(34,197,94,0.28)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_16px_50px_rgba(34,197,94,0.34)]"
            >
              Launch Calculator
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto rounded-2xl border border-white/12 bg-white/5 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/10 hover:border-white/20"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-8 md:py-12">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Analyze Your 3D Prints Instantly
          </h2>
          <p className="mt-4 text-slate-300 max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
            Upload a model, preview it on a virtual build plate, and get instant insight into material usage, machine time, printer compatibility, and price.
          </p>

          <div className="mt-10 max-w-5xl mx-auto rounded-[32px] border border-white/10 bg-slate-950/80 p-4 md:p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-green-500/10">
            <div className="rounded-[24px] overflow-hidden border border-white/8 shadow-[0_0_80px_rgba(34,197,94,0.08)]">
              <Image
                src="/layerledger-preview.svg"
                alt="LayerLedger calculator preview showing the 3D viewer and model analysis panel"
                width={1400}
                height={860}
                className="w-full h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Features Built for Modern 3D Print Shops</h2>
            <p className="text-slate-300 mt-4 max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
              From geometry analysis to instant quoting, LayerLedger gives you the core tools to price jobs faster and operate with less guesswork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              {
                icon: "3D",
                title: "Upload STL / OBJ / 3MF",
                description: "Bring in the most common 3D model formats with drag-and-drop uploads and instant preview.",
              },
              {
                icon: "AI",
                title: "Automatic Model Analysis",
                description: "Calculate volume, filament usage, dimensions, support estimates, and print time automatically.",
              },
              {
                icon: "PC",
                title: "Printer Compatibility Check",
                description: "Compare model size against real printer build volumes before you commit to a quote.",
              },
              {
                icon: "₹",
                title: "Instant Price Quote",
                description: "Combine material, machine, electricity, packaging, and shipping costs into a usable quote instantly.",
              },
              {
                icon: "MM",
                title: "Multi Model Build Plate",
                description: "Arrange multiple models on a virtual plate and see the impact on total cost and print time.",
              },
              {
                icon: "GST",
                title: "GST Cost Breakdown",
                description: "See production totals, margin, and tax-aware pricing in a clean business-ready breakdown.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-white/8 bg-slate-950/70 p-6 md:p-7 shadow-[0_18px_60px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-green-500/30 hover:bg-slate-900/80"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-500/25 to-blue-500/20 border border-white/10 text-green-300 flex items-center justify-center font-bold tracking-wide shadow-inner shadow-white/5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mt-5">{feature.title}</h3>
                <p className="text-slate-300 mt-3 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative px-6 py-20 md:py-24">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">How It Works</h2>
          <p className="text-slate-300 mt-4 max-w-3xl mx-auto text-base md:text-lg leading-relaxed">
            A simple flow designed to move you from model upload to confident pricing in minutes.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                number: "01",
                title: "Upload your 3D model",
                description: "Bring in STL, OBJ, or 3MF files and preview them on a virtual printer build plate.",
              },
              {
                number: "02",
                title: "Analyze geometry and printer fit",
                description: "LayerLedger evaluates volume, material use, dimensions, build plate compatibility, and print duration.",
              },
              {
                number: "03",
                title: "Get instant cost and profit estimate",
                description: "See production cost, quote price, and business margin before sending the job to print.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-3xl border border-white/8 bg-slate-950/70 p-6 md:p-8 text-left shadow-[0_18px_60px_rgba(0,0,0,0.24)]"
              >
                <div className="h-14 w-14 rounded-full bg-green-900/40 border border-green-500/30 text-green-300 flex items-center justify-center font-bold text-sm tracking-[0.2em]">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-white mt-5">{step.title}</h3>
                <p className="text-slate-300 mt-3 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 md:py-24">
        <div className="max-w-4xl mx-auto text-center rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/90 to-slate-900/90 px-6 py-14 md:px-12 shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-green-500/10">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Start Pricing Your 3D Prints Today
          </h2>
          <p className="text-slate-300 mt-4 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Upload your model, review the analysis, and generate instant print quotes with a workflow designed for real 3D printing businesses.
          </p>

          <button
            onClick={handleLaunchCalculator}
            className="mt-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-10 py-4 text-lg font-semibold text-black shadow-[0_12px_40px_rgba(34,197,94,0.28)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_16px_50px_rgba(34,197,94,0.34)]"
          >
            Open LayerLedger Calculator
          </button>
        </div>
      </section>

      <footer className="relative px-6 pb-12 pt-4">
        <div className="max-w-6xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-5">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
          <p>
            Built by <a href="https://lyka3dstudio.com" className="text-slate-300 hover:text-white transition-colors">LYKA3DStudio</a>
          </p>
        </div>
      </footer>

      {showLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 p-10 rounded-3xl w-[95%] max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign in to continue</h2>

            <button
              onClick={handleGoogleLogin}
              disabled={authLoading}
              className="w-full bg-white text-black py-3 rounded-xl font-semibold mb-4 hover:opacity-90 transition disabled:opacity-50"
            >
              {authLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="px-3 text-gray-400 text-sm">OR</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 mb-4 focus:outline-none focus:border-green-500"
            />

            <button
              onClick={handleEmailLogin}
              disabled={authLoading}
              className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {authLoading ? "Sending..." : "Send OTP"}
            </button>

            <button
              onClick={() => setShowLogin(false)}
              className="mt-6 text-sm text-gray-400 hover:text-white w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mb-6"></div>
          <p className="text-lg text-gray-300">Preparing your calculator...</p>
        </div>
      )}
    </main>
  );
}
