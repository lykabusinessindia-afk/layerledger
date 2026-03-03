"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Calculator() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [filamentUsed, setFilamentUsed] = useState(0);
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(0);
  const [printTimeHours, setPrintTimeHours] = useState(0);
  const [electricityRate, setElectricityRate] = useState(0);
  const [machinePowerWatts, setMachinePowerWatts] = useState(0);
  const [machineCostPerHour, setMachineCostPerHour] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [failureRate, setFailureRate] = useState(5);
  const [gstPercent, setGstPercent] = useState(0);
  const [profitMargin, setProfitMargin] = useState(30);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filamentCost = (filamentUsed / 1000) * filamentPricePerKg;
  const electricityCost =
    (machinePowerWatts / 1000) * printTimeHours * electricityRate;
  const machineCost = machineCostPerHour * printTimeHours;

  const totalCost =
    filamentCost +
    electricityCost +
    packagingCost +
    shippingCost +
    machineCost;

  const adjustedCost = totalCost * (1 + failureRate / 100);
  const baseSellingPrice =
    adjustedCost + (adjustedCost * profitMargin) / 100;
  const gstAmount = (baseSellingPrice * gstPercent) / 100;
  const sellingPrice = baseSellingPrice + gstAmount;
  const profitAmount = baseSellingPrice - adjustedCost;

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start items-center gap-6">

            <div className="text-center md:text-left">
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
                <span className="text-white">Layer</span>
                <span className="text-green-400 ml-1">Ledger</span>
              </h1>

              <p className="text-lg md:text-2xl text-gray-300 mt-4 max-w-2xl">
                Turn Every 3D Print Into{" "}
                <span className="text-green-500 font-semibold">
                  Predictable Profit
                </span>
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Sign Out
            </button>

          </div>
        </div>

        {/* INPUTS */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <input type="number" placeholder="Filament Used (grams)"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setFilamentUsed(Number(e.target.value))}
          />
          <input type="number" placeholder="Filament Price per KG"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setFilamentPricePerKg(Number(e.target.value))}
          />
          <input type="number" placeholder="Print Time (hours)"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setPrintTimeHours(Number(e.target.value))}
          />
          <input type="number" placeholder="Electricity Rate (per kWh)"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setElectricityRate(Number(e.target.value))}
          />
          <input type="number" placeholder="Machine Power (Watts)"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setMachinePowerWatts(Number(e.target.value))}
          />
          <input type="number" placeholder="Machine Cost Per Hour"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setMachineCostPerHour(Number(e.target.value))}
          />
          <input type="number" placeholder="Packaging Cost"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setPackagingCost(Number(e.target.value))}
          />
          <input type="number" placeholder="Shipping Cost"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setShippingCost(Number(e.target.value))}
          />
          <input type="number"
            placeholder="Failure Rate %"
            value={failureRate}
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setFailureRate(Number(e.target.value))}
          />
          <input type="number"
            placeholder="Profit Margin %"
            value={profitMargin}
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setProfitMargin(Number(e.target.value))}
          />
          <input type="number"
            placeholder="GST %"
            className="p-3 rounded bg-gray-800"
            onChange={(e)=>setGstPercent(Number(e.target.value))}
          />
        </div>

        {/* RESULTS */}
        <div className="mt-14 bg-gray-900 p-6 rounded-xl max-w-xl mx-auto shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>

          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Total Production Cost</span>
              <span>₹ {totalCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-green-400">
              <span>Net Profit</span>
              <span>₹ {profitAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Selling Price (Excl. GST)</span>
              <span>₹ {baseSellingPrice.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-yellow-400">
              <span>GST Amount</span>
              <span>₹ {gstAmount.toFixed(2)}</span>
            </div>

            <div className="border-t border-gray-700 my-2"></div>

            <div className="flex justify-between text-green-500 font-bold text-lg">
              <span>Final Selling Price (Incl. GST)</span>
              <span>₹ {sellingPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}