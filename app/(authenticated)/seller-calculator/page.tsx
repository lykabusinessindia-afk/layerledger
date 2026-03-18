export default function SellerCalculatorPage() {
  const cardClass =
    "rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-sm backdrop-blur-sm";

  return (
    <div className="layerledger-content space-y-6">
      <section className={cardClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
          Seller Calculator
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Seller Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Calculate your selling price, profit margins, and costs for your 3D printing business.
        </p>
      </section>
    </div>
  );
}
