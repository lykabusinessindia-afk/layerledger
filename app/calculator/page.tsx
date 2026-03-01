"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Calculator() {
  const [projectName, setProjectName] = useState("");
  const [filamentUsed, setFilamentUsed] = useState(0);
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(0);
  const [printTimeHours, setPrintTimeHours] = useState(0);
  const [electricityRate, setElectricityRate] = useState(0);
  const [machinePowerWatts, setMachinePowerWatts] = useState(0);
  const [machineCostPerHour, setMachineCostPerHour] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [profitMargin, setProfitMargin] = useState(30);
  const [loading, setLoading] = useState(false);

  // 🔹 Cost Calculations
  const filamentCost = (filamentUsed / 1000) * filamentPricePerKg;

  const electricityCost =
    (machinePowerWatts / 1000) *
    printTimeHours *
    electricityRate;

  const machineCost =
    machineCostPerHour * printTimeHours;

  const totalCost =
    filamentCost +
    electricityCost +
    packagingCost +
    shippingCost +
    machineCost;

  const baseSellingPrice =
    totalCost + (totalCost * profitMargin) / 100;

  const gstAmount =
    (baseSellingPrice * gstPercent) / 100;

  const sellingPrice =
    baseSellingPrice + gstAmount;

  const profitAmount =
    baseSellingPrice - totalCost;

  // 🔹 Save to Supabase
  const saveProject = async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      alert("Supabase URL not found. Check .env.local");
      return;
    }

    if (!projectName) {
      alert("Please enter Project Name");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("projects")
        .insert([
          {
            projectname: projectName,
            filamentcost: filamentCost,
            electricitycost: electricityCost,
            machinecost: machineCost,
            packagingcost: packagingCost,
            shippingcost: shippingCost,
            gstamount: gstAmount,
            totalcost: totalCost,
            sellingprice: sellingPrice,
          },
        ]);

      if (error) {
        throw error;
      }

      alert("✅ Project Saved Successfully!");
      setProjectName("");

    } catch (err: any) {
      console.error("Full Error:", err);
      alert("❌ Error saving project: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">
          LayerLedger
        </h1>

        <p className="text-gray-400 text-center mb-8">
          Smart Cost & Profit Calculator for 3D Printing Sellers
        </p>

        <div className="flex flex-col gap-3 max-w-md">

          <input
            type="text"
            placeholder="Project Name"
            value={projectName}
            className="p-3 rounded bg-gray-800"
            onChange={(e) => setProjectName(e.target.value)}
          />

          <input type="number" placeholder="Filament Used (grams)" className="p-3 rounded bg-gray-800" onChange={(e) => setFilamentUsed(Number(e.target.value))}/>
          <input type="number" placeholder="Filament Price per KG" className="p-3 rounded bg-gray-800" onChange={(e) => setFilamentPricePerKg(Number(e.target.value))}/>
          <input type="number" placeholder="Print Time (hours)" className="p-3 rounded bg-gray-800" onChange={(e) => setPrintTimeHours(Number(e.target.value))}/>
          <input type="number" placeholder="Electricity Rate (per kWh)" className="p-3 rounded bg-gray-800" onChange={(e) => setElectricityRate(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Power (Watts)" className="p-3 rounded bg-gray-800" onChange={(e) => setMachinePowerWatts(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Cost Per Hour" className="p-3 rounded bg-gray-800" onChange={(e) => setMachineCostPerHour(Number(e.target.value))}/>
          <input type="number" placeholder="Packaging Cost" className="p-3 rounded bg-gray-800" onChange={(e) => setPackagingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Shipping Cost" className="p-3 rounded bg-gray-800" onChange={(e) => setShippingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Profit Margin %" defaultValue={30} className="p-3 rounded bg-gray-800" onChange={(e) => setProfitMargin(Number(e.target.value))}/>
          <input type="number" placeholder="GST %" className="p-3 rounded bg-gray-800" onChange={(e) => setGstPercent(Number(e.target.value))}/>

          <button
  onClick={() => {
    navigator.clipboard.writeText(`Selling Price: ₹${sellingPrice.toFixed(2)}`);
    alert("Price copied to clipboard 🚀");
  }}
  className="bg-blue-600 hover:bg-blue-700 p-3 rounded font-bold"
>
  Copy Selling Price
</button>
        </div>

        <div className="mt-10 bg-gray-900 p-6 rounded max-w-md">
          <h2 className="text-xl font-semibold mb-4">
            Cost Breakdown
          </h2>

          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between">
              <span>Total Production Cost</span>
              <span>₹ {totalCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-green-400">
              <span>Net Profit</span>
              <span>₹ {profitAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-green-500 font-bold text-lg">
              <span>Selling Price</span>
              <span>₹ {sellingPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}