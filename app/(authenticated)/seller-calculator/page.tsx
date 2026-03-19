"use client";

import { useMemo, useState } from "react";
import { calculatePricingBreakdown, toNumber } from "@/lib/pricing";

type AccessoryItem = {
  id: number;
  name: string;
  cost: string;
};

const materialTypes = ["PLA", "PLA SILK", "PLA MATTE", "PETG", "ABS", "ASA", "TPU"];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const defaultState = {
  materialType: "PLA",
  materialCostPerGram: "2.5",
  filamentUsed: "120",
  printTime: "5",
  machineCostPerHour: "50",
  electricityCostPerHour: "8",
  laborCost: "100",
  failureRate: "5",
  packagingCost: "30",
  shippingCost: "0",
  profitMargin: 30,
  gst: "18",
};

export default function SellerCalculatorPage() {
  const [materialType, setMaterialType] = useState(defaultState.materialType);
  const [materialCostPerGram, setMaterialCostPerGram] = useState(defaultState.materialCostPerGram);
  const [filamentUsed, setFilamentUsed] = useState(defaultState.filamentUsed);
  const [printTime, setPrintTime] = useState(defaultState.printTime);
  const [machineCostPerHour, setMachineCostPerHour] = useState(defaultState.machineCostPerHour);
  const [electricityCostPerHour, setElectricityCostPerHour] = useState(defaultState.electricityCostPerHour);
  const [laborCost, setLaborCost] = useState(defaultState.laborCost);
  const [failureRate, setFailureRate] = useState(defaultState.failureRate);
  const [accessories, setAccessories] = useState<AccessoryItem[]>([
    { id: 1, name: "Nozzle wear", cost: "20" },
  ]);
  const [packagingCost, setPackagingCost] = useState(defaultState.packagingCost);
  const [shippingCost, setShippingCost] = useState(defaultState.shippingCost);
  const [profitMargin, setProfitMargin] = useState(defaultState.profitMargin);
  const [profitMarginInput, setProfitMarginInput] = useState(String(defaultState.profitMargin));
  const [gst, setGst] = useState(defaultState.gst);

  const addAccessory = () => {
    setAccessories((prev) => [...prev, { id: Date.now(), name: "", cost: "0" }]);
  };

  const removeAccessory = (id: number) => {
    setAccessories((prev) => prev.filter((item) => item.id !== id));
  };

  const updateAccessory = (id: number, key: "name" | "cost", value: string) => {
    setAccessories((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  };

  const handleProfitSlider = (v: number) => {
    setProfitMargin(v);
    setProfitMarginInput(String(v));
  };

  const handleProfitInput = (v: string) => {
    setProfitMarginInput(v);
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 100) setProfitMargin(n);
  };

  const handleReset = () => {
    setMaterialType(defaultState.materialType);
    setMaterialCostPerGram(defaultState.materialCostPerGram);
    setFilamentUsed(defaultState.filamentUsed);
    setPrintTime(defaultState.printTime);
    setMachineCostPerHour(defaultState.machineCostPerHour);
    setElectricityCostPerHour(defaultState.electricityCostPerHour);
    setLaborCost(defaultState.laborCost);
    setFailureRate(defaultState.failureRate);
    setAccessories([{ id: 1, name: "Nozzle wear", cost: "20" }]);
    setPackagingCost(defaultState.packagingCost);
    setShippingCost(defaultState.shippingCost);
    setProfitMargin(defaultState.profitMargin);
    setProfitMarginInput(String(defaultState.profitMargin));
    setGst(defaultState.gst);
  };

  const values = useMemo(() => {
    const accessoriesCost = accessories.reduce((sum, item) => sum + toNumber(item.cost), 0);
    return calculatePricingBreakdown({
      materialCostPerGram: toNumber(materialCostPerGram),
      filamentUsedGrams: toNumber(filamentUsed),
      printTimeHours: toNumber(printTime),
      machineCostPerHour: toNumber(machineCostPerHour),
      electricityCostPerHour: toNumber(electricityCostPerHour),
      laborCost: toNumber(laborCost),
      accessoriesCost,
      packagingCost: toNumber(packagingCost),
      shippingCost: toNumber(shippingCost),
      failureRatePercent: toNumber(failureRate),
      profitMarginPercent: profitMargin,
      gstPercent: toNumber(gst),
    });
  }, [materialCostPerGram, filamentUsed, printTime, machineCostPerHour, electricityCostPerHour, laborCost, accessories, failureRate, packagingCost, shippingCost, profitMargin, gst]);

  const cardClass = "rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-sm backdrop-blur-sm sm:p-6";
  const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20";

  const ResultRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <div className="flex items-center justify-between">
      <span className={accent ? "font-medium text-green-300" : ""}>{label}</span>
      <span className={`font-medium ${accent ? "text-green-300" : "text-white"}`}>{value}</span>
    </div>
  );

  return (
    <div className="layerledger-content space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">Seller Calculator</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          3D Printing Seller Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Calculate accurate cost, profit, and selling price for your 3D printed products.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: Inputs */}
        <div className="space-y-6">
          {/* Material */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white">Material</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm text-slate-300">
                Material type
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className={inputClass}
                >
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Material cost per gram (₹)
                <input type="number" min="0" step="0.01" value={materialCostPerGram}
                  onChange={(e) => setMaterialCostPerGram(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">
                Filament used (grams)
                <input type="number" min="0" step="0.01" value={filamentUsed}
                  onChange={(e) => setFilamentUsed(e.target.value)} className={inputClass} />
              </label>
            </div>
          </section>

          {/* Machine & Time */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white">Machine &amp; Time</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm text-slate-300">
                Print time (hours)
                <input type="number" min="0" step="0.1" value={printTime}
                  onChange={(e) => setPrintTime(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">
                Machine cost / hr (₹)
                <input type="number" min="0" step="0.01" value={machineCostPerHour}
                  onChange={(e) => setMachineCostPerHour(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">
                Electricity cost / hr (₹)
                <input type="number" min="0" step="0.01" value={electricityCostPerHour}
                  onChange={(e) => setElectricityCostPerHour(e.target.value)} className={inputClass} />
              </label>
            </div>
          </section>

          {/* Extra Costs + Accessories */}
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Extra Costs</h2>
              <button type="button" onClick={addAccessory}
                className="rounded-xl border border-green-400/30 bg-green-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-green-300 transition hover:bg-green-500/25">
                + Add Accessory
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Labor cost (₹)
                <input type="number" min="0" step="0.01" value={laborCost}
                  onChange={(e) => setLaborCost(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">
                Failure rate (%)
                <input type="number" min="0" max="99" step="0.1" value={failureRate}
                  onChange={(e) => setFailureRate(e.target.value)} className={inputClass} />
              </label>
            </div>

            {accessories.length > 0 && (
              <div className="mt-5 space-y-3">
                {accessories.map((item) => (
                  <div key={item.id}
                    className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[1fr_140px_auto]">
                    <input type="text" placeholder="Accessory name" value={item.name}
                      onChange={(e) => updateAccessory(item.id, "name", e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20" />
                    <input type="number" min="0" step="0.01" placeholder="Cost (₹)" value={item.cost}
                      onChange={(e) => updateAccessory(item.id, "cost", e.target.value)}
                      className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20" />
                    <button type="button" onClick={() => removeAccessory(item.id)}
                      className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/25">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
              Accessories total:{" "}
              <span className="font-semibold text-white">{currency.format(values.accessoriesCost)}</span>
            </div>
          </section>

          {/* Packaging & Misc */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white">Packaging &amp; Misc</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Packaging cost (₹)
                <input type="number" min="0" step="0.01" value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm text-slate-300">
                Shipping cost (₹) <span className="text-slate-500">(optional)</span>
                <input type="number" min="0" step="0.01" value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)} className={inputClass} />
              </label>
            </div>
          </section>

          {/* Pricing Settings */}
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-white">Pricing Settings</h2>
            <div className="mt-4 space-y-5">
              <div className="text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Profit margin</span>
                  <input type="number" min="0" max="100" step="1" value={profitMarginInput}
                    onChange={(e) => handleProfitInput(e.target.value)}
                    className="w-20 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-1.5 text-sm text-white outline-none transition focus:border-green-400/60 focus:ring-2 focus:ring-green-500/20" />
                </div>
                <input type="range" min="0" max="100" step="1" value={profitMargin}
                  onChange={(e) => handleProfitSlider(Number.parseInt(e.target.value, 10))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-green-500" />
              </div>
              <label className="block text-sm text-slate-300">
                GST (%)
                <input type="number" min="0" step="0.1" value={gst}
                  onChange={(e) => setGst(e.target.value)} className={inputClass} />
              </label>
            </div>
          </section>

          {/* Reset */}
          <button type="button" onClick={handleReset}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
            Reset to Defaults
          </button>
        </div>

        {/* Right: Result Panel */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <section className={`${cardClass} space-y-4`}>
            <h2 className="text-lg font-bold text-white">Result</h2>

            <div className="space-y-2 text-sm text-slate-300">
              <ResultRow label="Material cost" value={currency.format(values.materialCost)} />
              <ResultRow label="Machine cost" value={currency.format(values.machineCost)} />
              <ResultRow label="Electricity cost" value={currency.format(values.electricityCost)} />
              <ResultRow label="Labor cost" value={currency.format(values.laborCost)} />
              <ResultRow label="Accessories cost" value={currency.format(values.accessoriesCost)} />
              <ResultRow label="Packaging cost" value={currency.format(values.packagingCost)} />
              <ResultRow label="Shipping cost" value={currency.format(values.shippingCost)} />
              <div className="my-2 border-t border-white/10" />
              <ResultRow label="Base cost" value={currency.format(values.baseCost)} />
              <ResultRow label="Adjusted cost (failure)" value={currency.format(values.adjustedCost)} />
              <ResultRow label="Profit amount" value={currency.format(values.profitAmount)} accent />
              <ResultRow label="Final price (before GST)" value={currency.format(values.finalPrice)} />
              <ResultRow label="GST amount" value={currency.format(values.gstAmount)} />
            </div>

            <div className="rounded-2xl border border-green-400/25 bg-green-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-200">
                Final Price With GST
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight text-green-300 sm:text-4xl">
                {currency.format(values.finalPriceWithGST)}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
