"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// ...existing code...
import { supabase } from "@/lib/supabase";

// ...existing code...

export default function Login() {
  const router = useRouter();
  const loginPanelRef = useRef<HTMLElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ background: "radial-gradient(circle at 20% 30%, #0a1f44 0%, #020617 65%)" }}
    >
      {/* Animation keyframes */}
      <style>{`
        @keyframes buttonGlowPulse {
          0%, 100% { 
            box-shadow: 0 10px 30px rgba(0,114,255,0.40);
          }
          50% { 
            box-shadow: 0 10px 40px rgba(0,114,255,0.55), 0 0 20px rgba(0,198,255,0.25);
          }
        }
      `}</style>

      {/* Animated background glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-40 h-[560px] w-[560px] animate-pulse rounded-full blur-[130px]"
          style={{ background: "rgba(0,198,255,0.13)", animationDuration: "4s" }}
        />
        <div
          className="absolute -bottom-20 right-0 h-[620px] w-[620px] animate-pulse rounded-full blur-[150px]"
          style={{ background: "rgba(0,114,255,0.10)", animationDuration: "5s", animationDelay: "1.5s" }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
          style={{ background: "rgba(99,102,241,0.07)" }}
        />
      </div>

      {/* Popup Modal for Upload Your File */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.55)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#101828",
              color: "#fff",
              borderRadius: 16,
              boxShadow: "0 0 40px 0 rgba(0,198,255,0.18)",
              padding: "2.5rem 2.5rem 2rem 2.5rem",
              minWidth: 320,
              maxWidth: "90vw",
              textAlign: "center",
              position: "relative",
              border: "1px solid rgba(0,198,255,0.18)",
            }}
          >
            <button
              onClick={handleCloseModal}
              aria-label="Close"
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                background: "transparent",
                border: "none",
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
                opacity: 0.7,
              }}
            >
              ×
            </button>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
              Sign in to upload your file
            </div>
          </div>
        </div>
      )}

      {/* Main 2-column grid */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1200px] grid-cols-1 items-center px-6 md:grid-cols-2 md:gap-x-20 md:gap-y-12 md:px-8 lg:px-12">
        
        {/* Vertical divider */}
        <div
          className="pointer-events-none absolute hidden bottom-0 top-0 w-px md:block"
          style={{
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(180deg, transparent 0%, rgba(0,198,255,0.4) 35%, rgba(0,198,255,0.35) 50%, rgba(0,114,255,0.3) 65%, transparent 100%)",
            opacity: 0.3,
          }}
        />

        {/* ── LEFT: Hero ── */}
        <section className="flex flex-col justify-center h-full min-h-[600px] md:min-h-[700px] lg:min-h-[750px] text-center md:items-start md:text-left">
          <div className="flex flex-col items-center md:items-start w-full max-w-lg mx-auto md:mx-0">
            <h1 className="text-4xl font-extrabold leading-[1.12] tracking-wide text-white md:text-5xl lg:text-[3.6rem]">
              Turn your 3D ideas into
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg, #00c6ff, #0072ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                real products.
              </span>
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed tracking-wide text-white/60 md:text-lg">
              Upload your design, get instant pricing, and bring your creations to life with precision 3D printing.
            </p>
            <p className="mt-5 text-sm tracking-wide text-white/45">
              Powered by LayerLedger
            </p>
            <div className="mt-9 space-y-2.5 w-full">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/25">
                Coming Soon
              </p>
              {[
                "Instant price calculator",
                "Smart print optimization",
                "Live order tracking"
              ].map((item) => {
                return (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-white/55">
                    <span
                      className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ background: "#00c6ff" }}
                    />
                    {item}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleUploadYourFileClick}
              className="mt-10 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(90deg, #00c6ff, #0072ff)",
                boxShadow: "0 10px 32px rgba(0,114,255,0.45)",
              }}
            >
              Upload Your File
            </button>
          </div>
        </section>

        {/* ── RIGHT: Login form — NO card ── */}
        <section
          ref={loginPanelRef}
          tabIndex={-1}
          className="relative flex flex-col justify-center py-16 outline-none shadow-[0_0_42px_rgba(0,150,255,0.14)] md:ml-6 lg:ml-10"
        >
          {/* Subtle glow behind login area */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(circle at 50% 40%, rgba(0,114,255,0.12) 0%, rgba(0,198,255,0.06) 30%, transparent 65%)",
              borderRadius: "50%",
              filter: "blur(40px)",
            }}
          />

          <div className="relative z-10 w-full max-w-sm text-center md:mx-auto">
            <p className="text-2xl font-bold tracking-wide text-white">Welcome 👋</p>
            <h2
              className="mt-1 text-5xl font-black tracking-[0.03em]"
              style={{
                background: "linear-gradient(90deg, #ffffff 0%, #ffffff 46%, #00ff94 62%, #00c853 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1.25,
                overflow: "visible",
              }}
            >
              LayerLedger
            </h2>
            {/*
            <p className="mt-3 text-sm text-white/50">
              Built by{" "}
              <a
                href="https://lyka3dstudio.com"
                className="text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
              >
                LYKA3DStudio
              </a>
            </p>
            */}

            <div className="mt-12 space-y-5">

              {/* Email input with icon */}
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-white/25 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid #00c6ff";
                    e.currentTarget.style.boxShadow = "0 0 18px rgba(0,198,255,0.34), inset 0 0 8px rgba(0,198,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password input with icon */}
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-white/25 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid #00c6ff";
                    e.currentTarget.style.boxShadow = "0 0 18px rgba(0,198,255,0.34), inset 0 0 8px rgba(0,198,255,0.08)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Login button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "linear-gradient(90deg, #00c6ff, #0072ff)",
                  boxShadow: "0 12px 34px rgba(0,114,255,0.45), 0 0 18px rgba(0,198,255,0.18)",
                  animation: "buttonGlowPulse 3.5s ease-in-out infinite",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.animationPlayState = "paused";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.animationPlayState = "running";
                }}
              >
                {loading ? "Loading..." : "Login"}
              </button>

              {/* Sign Up button */}
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full rounded-xl py-3.5 text-sm text-white/65 transition-all duration-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Create an account
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-white/25">
                <span className="h-px flex-1 bg-white/10" />
                <span>OR</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* Google button */}
              <button
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium text-black transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </button>

              {/* Trust elements */}
              <div className="flex items-center justify-center gap-5 pt-1">
                {[ 
                  { text: "Secure login" },
                  { text: "No spam" },
                  { text: "500+ makers" },
                ].map(({ text }) => (
                  <span key={text} className="flex items-center gap-1 text-xs text-white/28">
                    <span style={{ color: "#00c6ff" }}>✔</span>
                    {text}
                  </span>
                ))}
              </div>

            </div>
          </div>
        </section>

      </div>
    </div>
  );
}