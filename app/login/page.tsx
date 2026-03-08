"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      router.push("/calculator");
    }
  };

  const handleSignup = async () => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Account created. Now login.");
    }
  };

  const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/calculator`,
    },
  });
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md space-y-4 shadow-xl">

        <h1 className="text-3xl font-bold text-center">
          LayerLedger
        </h1>
        <p className="text-center text-sm text-gray-400 mt-2">
Built by <a href="https://lyka3dstudio.com" className="underline">LYKA 3D Studio</a>
</p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-gray-800"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-gray-800"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full p-3 bg-blue-600 rounded hover:bg-blue-700"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full p-3 bg-green-600 rounded hover:bg-green-700"
        >
          Sign Up
        </button>

        <div className="text-center text-gray-400">OR</div>

        <button
          onClick={handleGoogleLogin}
          className="w-full p-3 bg-red-600 rounded hover:bg-red-700"
        >
          Continue with Google
        </button>

      </div>
    </div>
  );
}