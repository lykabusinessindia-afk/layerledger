"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

useEffect(() => {
  const handler = (e: any) => {
    e.preventDefault();
    setInstallPrompt(e);
  };

  window.addEventListener("beforeinstallprompt", handler);

  return () => {
    window.removeEventListener("beforeinstallprompt", handler);
  };
}, []);

const handleInstall = async () => {
  if (!installPrompt) return;

  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("App installed");
  }

  setInstallPrompt(null);
};
  const router = useRouter();

  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  // 🔐 Listen for successful login
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setShowLogin(false);
          setLoading(true);

          setTimeout(() => {
            router.push("/calculator");
          }, 800);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  // 📧 Email Login
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

  // 🌍 Google Login
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
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex flex-col items-center justify-center px-6 relative">

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
style={{
  backgroundColor: "#16a34a",
  color: "white",
  padding: "10px 18px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  marginTop: "12px",
  fontWeight: "600",
  transition: "0.2s"
}}
>
Install LayerLedger
</button>
      <p className="text-center text-sm text-gray-400 mt-6">
Built by <a href="https://lyka3dstudio.com" className="underline">LYKA3DStudio</a>
</p>

      {showLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 p-10 rounded-3xl w-[95%] max-w-md shadow-2xl">

            <h2 className="text-2xl font-bold mb-6 text-center">
              Sign in to continue
            </h2>

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
          <p className="text-lg text-gray-300">
            Preparing your calculator...
          </p>
        </div>
      )}

    </main>
  );
}