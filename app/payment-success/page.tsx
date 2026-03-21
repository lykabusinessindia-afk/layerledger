"use client";

export default function PaymentSuccessPage() {
  const handleGoHome = () => {
    window.location.href = "https://lyka3dstudio.com";
  };

  const handleTrackOrder = () => {
    window.location.href = "/my-orders";
  };

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center">
        <section className="w-full rounded-2xl border border-green-500/30 bg-gray-900/90 p-8 shadow-2xl shadow-green-900/20 md:p-10">
          <div className="space-y-3 text-center">
            <h1 className="text-3xl font-bold text-green-400 md:text-4xl">
              Payment Successful 🎉
            </h1>
            <p className="text-sm text-gray-300 md:text-base">
              Your order has been placed successfully.
            </p>
          </div>

          <div className="mt-8 space-y-4 rounded-xl border border-green-500/20 bg-black/30 p-5 text-sm text-gray-200 md:text-base">
            <p>We have received your advance payment.</p>
            <p>Final price will be confirmed after model slicing.</p>
            <p>You will be notified for remaining payment.</p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleGoHome}
              className="w-full rounded-lg bg-green-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-green-700 sm:w-auto"
            >
              Go to Home
            </button>
            <button
              type="button"
              onClick={handleTrackOrder}
              className="w-full rounded-lg border border-green-500/40 bg-green-950/30 px-5 py-3 font-semibold text-green-200 transition hover:border-green-400 hover:text-green-100 sm:w-auto"
            >
              Track Order
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
