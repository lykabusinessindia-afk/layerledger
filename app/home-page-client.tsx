"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useInstallPrompt } from "@/lib/useInstallPrompt";

export default function HomePageClient() {
  const { promptInstall } = useInstallPrompt();

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) console.log("App installed");
  };

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

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/calculator`,
      },
    });

    if (error) {
      setAuthLoading(false);
      alert(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white px-6 py-16 relative">
      <section className="max-w-6xl mx-auto flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-7xl font-extrabold mb-6 tracking-tight">
          Layer<span className="text-green-500">Ledger</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 text-center max-w-2xl mb-12 leading-relaxed">
          The Simplest Way to Price Your 3D Prints Profitably.
          <br />
          Know your real cost. Price with confidence.
        </p>

        <button
          onClick={async () => {
            const { data } = await supabase.auth.getSession();

            if (data.session) {
              router.push("/calculator");
            } else {
              setShowLogin(true);
            }
          }}
          className="bg-green-600 hover:bg-green-700 transition-all duration-300 px-10 py-4 rounded-xl"
        >
          Launch Calculator
        </button>
        <button
          onClick={handleInstall}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg mt-3 font-semibold transition-all duration-300"
        >
          Install LayerLedger
        </button>
        <p className="text-center text-sm text-gray-400 mt-6">
          Built by <a href="https://lyka3dstudio.com" className="underline">LYKA3DStudio</a>
        </p>
      </section>

      <section className="max-w-6xl mx-auto mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Features</h2>
          <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
            Everything you need to evaluate a print job, validate printer fit, and quote with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[
            {
              title: "Upload 3D Models",
              description: "Supports STL, OBJ, and 3MF file uploads.",
            },
            {
              title: "Automatic Model Analysis",
              description: "Instantly calculates volume, filament usage, dimensions, and estimated print time.",
            },
            {
              title: "Printer Compatibility Check",
              description: "Verify if the model fits common 3D printers like Ender 3, Bambu Lab, Prusa, and others.",
            },
            {
              title: "Build Plate Preview",
              description: "View the model on a virtual build plate with grid and XYZ axes.",
            },
            {
              title: "Instant Price Quote",
              description: "Automatically estimate printing cost based on material, electricity, machine time, and other inputs.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-6 shadow-lg shadow-black/20"
            >
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="text-gray-400 mt-3 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How LayerLedger Works</h2>
          <p className="text-gray-400 mt-3 max-w-2xl mx-auto">
            Upload a model, let LayerLedger analyze it, and get a usable print quote in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "Step 1",
              marker: "01",
              title: "Upload Model",
              description: "Drag and drop your STL, OBJ, or 3MF file.",
            },
            {
              step: "Step 2",
              marker: "02",
              title: "Automatic Analysis",
              description: "LayerLedger calculates model volume, filament usage, dimensions, and print time.",
            },
            {
              step: "Step 3",
              marker: "03",
              title: "Get Instant Price Quote",
              description: "See the estimated printing cost based on your printer settings.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-6 shadow-lg shadow-black/20"
            >
              <div className="h-12 w-12 rounded-full bg-green-900/40 border border-green-500/30 text-green-300 flex items-center justify-center font-bold text-sm">
                {item.marker}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-green-400 mt-4">{item.step}</p>
              <h3 className="text-xl font-semibold text-white mt-2">{item.title}</h3>
              <p className="text-gray-400 mt-3 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto mt-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">See LayerLedger in Action</h2>
        <p className="text-gray-400 mt-3 max-w-3xl mx-auto leading-relaxed">
          Upload a 3D model, preview it on a virtual build plate, and instantly analyze print costs with automated volume, filament, and pricing insights.
        </p>

        <div className="mt-10 max-w-5xl mx-auto rounded-3xl border border-gray-800 bg-gray-950/70 p-4 md:p-6 shadow-2xl shadow-black/30">
          <Image
            src="/layerledger-preview.svg"
            alt="LayerLedger calculator preview showing the 3D viewer and model analysis panel"
            width={1400}
            height={860}
            className="w-full h-auto rounded-2xl border border-gray-800"
            priority
          />
        </div>
      </section>

      <section className="max-w-4xl mx-auto mt-24 text-center">
        <div className="rounded-3xl border border-gray-800 bg-gray-950/70 px-6 py-12 md:px-10 shadow-2xl shadow-black/30">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Start Calculating Your 3D Print Costs Today
          </h2>
          <p className="text-gray-400 mt-4 max-w-2xl mx-auto leading-relaxed">
            Upload a model, analyze filament usage and print time, and get an instant price estimate for your next 3D print job.
          </p>

          <button
            onClick={async () => {
              const { data } = await supabase.auth.getSession();

              if (data.session) {
                router.push("/calculator");
              } else {
                setShowLogin(true);
              }
            }}
            className="mt-8 bg-green-600 hover:bg-green-700 transition-all duration-300 px-10 py-4 rounded-xl text-lg font-semibold"
          >
            Launch LayerLedger Calculator
          </button>
        </div>
      </section>

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
