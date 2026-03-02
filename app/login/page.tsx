"use client";

import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  

  // ✅ IMPORTANT: Auto redirect if session exists
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.push("/calculator");
      }
    };

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          router.push("/calculator");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);

  const handleEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/calculator`,
      },
    });

    if (!error) {
      alert("Check your email for login link 🚀");
    } else {
      alert(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/calculator`,
      },
    });
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Login to LayerLedger</h1>

      <input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-80 bg-gray-900 border border-gray-600 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
/>

     <button
  onClick={handleEmailLogin}
  className="bg-green-600 hover:bg-green-700 transition px-6 py-2 rounded-lg font-semibold"
>
  Login with Email
</button>

      <button
        onClick={handleGoogleLogin}
        className="bg-white text-black hover:bg-gray-200 transition px-6 py-2 rounded-lg font-semibold"
      >
        Continue with Google
      </button>
    </main>
  );
}