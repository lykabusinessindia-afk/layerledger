"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { supabase } from "@/lib/supabase";

function FloatingTorusKnot() {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    meshRef.current.rotation.y += delta * 0.45;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.15;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.12;
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[0.85, 0.28, 160, 28]} />
      <meshStandardMaterial color="#6366f1" metalness={0.55} roughness={0.3} emissive="#1d4ed8" emissiveIntensity={0.25} />
    </mesh>
  );
}

export default function Login() {
  const router = useRouter();
  const loginPanelRef = useRef<HTMLElement>(null);

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
    const oauthPath = "/api/auth/signin/google?callbackUrl=/calculator";
    const topWindow = window.top;

    if (topWindow && topWindow !== window.self) {
      topWindow.location.href = oauthPath;
      return;
    }

    window.location.href = oauthPath;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthProvider = params.get("oauth");
    const callbackUrlParam = params.get("callbackUrl") ?? "/calculator";
    const safeCallbackPath =
      callbackUrlParam.startsWith("/") && !callbackUrlParam.startsWith("//")
        ? callbackUrlParam
        : "/calculator";

    if (oauthProvider !== "google") return;

    void supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${safeCallbackPath}`,
      },
    });
  }, []);

  const handleUploadYourFileClick = () => {
    loginPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    loginPanelRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-5 md:gap-10 md:px-10 lg:px-16">
        <section className="md:col-span-3 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8 h-72 w-full max-w-[480px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_0_70px_rgba(99,102,241,0.2)]">
            <div className="absolute inset-10 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(96,165,250,0.18),transparent_65%)]" />
            <div className="relative h-full w-full">
              <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
                <ambientLight intensity={0.85} />
                <directionalLight position={[2, 2, 2]} intensity={1.2} color="#93c5fd" />
                <pointLight position={[-2, -1, 2]} intensity={0.6} color="#60a5fa" />
                <FloatingTorusKnot />
              </Canvas>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight md:text-5xl">Print anything. Instantly.</h2>
          <p className="mt-4 max-w-xl text-base text-white/70 md:text-lg">
            Upload your 3D file and we will turn it into a real product.
          </p>

          <div className="mt-5 max-w-xl space-y-2 text-center">
            <p className="text-sm font-medium text-white/85">LayerLedger by LYKA3DStudio</p>
            <p className="text-sm text-white/60">
              We are building a simple way to turn your digital ideas into real products.
            </p>
          </div>

          <div className="mt-5 w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <p className="text-sm font-semibold text-white/85">Coming Soon</p>
            <ul className="mt-2 space-y-1 text-sm text-white/65">
              <li>- Instant price calculator</li>
              <li>- Smart print optimization</li>
              <li>- Live order tracking</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleUploadYourFileClick}
            className="mt-8 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-[1.02]"
          >
            Upload Your File
          </button>
        </section>

        <section
          ref={loginPanelRef}
          tabIndex={-1}
          className="md:col-span-2 w-full max-w-md self-center justify-self-center rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-2xl"
        >
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-semibold text-white">LayerLedger</h1>
            <p className="mt-1 text-sm text-white/60">
              Built by <a href="https://lyka3dstudio.com" className="text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">LYKA3DStudio</a>
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 transition-all focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 transition-all focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 py-2.5 font-medium text-white shadow-lg transition-all hover:from-blue-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Loading..." : "Login"}
            </button>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Sign Up
            </button>

            <div className="flex items-center gap-3 text-sm text-white/40">
              <span className="h-px flex-1 bg-white/10" />
              <span>OR</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full rounded-lg bg-white py-2.5 font-medium text-black transition-all hover:bg-white/90"
            >
              <span className="flex items-center justify-center gap-2">
                <span aria-hidden>G</span>
                Continue with Google
              </span>
            </button>

            <p className="mt-3 text-center text-xs text-white/40">🔒 Secure login • Your data is protected</p>
          </div>
        </section>
      </div>
    </div>
  );
}