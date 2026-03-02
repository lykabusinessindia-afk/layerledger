"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Calculator() {
  const router = useRouter();

  // 🔐 Auth
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 🔥 Waitlist
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  // 🔹 Calculator States
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

  // 🔐 Authentication Check
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

  // 🔓 Sign Out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // 🔥 Waitlist Handler
  const handleWaitlist = async () => {
    if (!waitlistEmail) {
      alert("Please enter your email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(waitlistEmail)) {
      alert("Enter a valid email address");
      return;
    }

    try {
      setJoining(true);

      const { error } = await supabase
        .from("waitlist")
        .insert([{ email: waitlistEmail.toLowerCase() }]);

      if (error) {
        console.log("Waitlist Error:", error);

        if (error.code === "23505") {
          alert("You are already on the waitlist 😉");
        } else {
          alert(error.message);
        }

        setJoining(false);
        return;
      }

      alert("You're on the waitlist 🚀");
      setWaitlistEmail("");
      setJoining(false);

    } catch (err) {
      console.log("Unexpected Error:", err);
      alert("Unexpected error occurred.");
      setJoining(false);
    }
  };

  // 🔹 Calculations
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

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">

        {/* Sign Out */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Sign Out
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center">
          LayerLedger
        </h1>

        <p className="text-gray-400 text-center mb-8">
          Smart Cost & Profit Calculator for 3D Printing Sellers
        </p>

        {/* INPUTS */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto">

          <input type="text" placeholder="Project Name" value={projectName} className="p-3 rounded bg-gray-800" onChange={(e) => setProjectName(e.target.value)} />
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
        </div>

        {/* RESULTS */}
        <div className="mt-12 bg-gray-900 p-6 rounded-xl max-w-xl mx-auto shadow-lg">
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

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Final Selling Price (Incl. GST): ₹${sellingPrice.toFixed(2)}`
                );
                alert("Price copied 🚀");
              }}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 p-3 rounded font-bold"
            >
              Copy Final Selling Price
            </button>

            {/* PRO SECTION */}
            <div className="mt-10 p-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-gray-700">
              <h2 className="text-xl font-bold text-green-400 mb-3">
                🔥 LayerLedger Pro Coming Soon
              </h2>

              <ul className="text-gray-300 space-y-2 text-sm">
                <li>• Save projects</li>
                <li>• Profit analytics</li>
                <li>• GST invoice export</li>
                <li>• Material presets</li>
              </ul>

              <p className="mt-4 text-gray-400 text-sm">
                Join waitlist to get early access.
              </p>

              {/* EMAIL INPUT MOVED HERE */}
              <input
                type="email"
                placeholder="Enter your email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                className="mt-4 w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500"
              />

              <button
                onClick={handleWaitlist}
                disabled={joining}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join Waitlist"}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}