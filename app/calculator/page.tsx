"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Calculator() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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

  const handleWaitlist = async () => {
    if (!waitlistEmail) {
      alert("Please enter your email");
      return;
    }

    try {
      setJoining(true);
      const { error } = await supabase
        .from("waitlist")
        .insert([{ email: waitlistEmail.toLowerCase() }]);

      if (error) {
        alert(error.message);
        setJoining(false);
        return;
      }

      alert("You're on the waitlist 🚀");
      setWaitlistEmail("");
      setJoining(false);
    } catch {
      alert("Unexpected error occurred.");
      setJoining(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) {
      alert("Please enter your feedback");
      return;
    }

    try {
      setSubmittingFeedback(true);
      const { error } = await supabase
        .from("feedback")
        .insert([{ message: feedback }]);

      if (error) {
        alert(error.message);
        setSubmittingFeedback(false);
        return;
      }

      alert("Thank you for your feedback 🙌");
      setFeedback("");
      setSubmittingFeedback(false);
    } catch {
      alert("Unexpected error occurred.");
      setSubmittingFeedback(false);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="max-w-3xl mx-auto">

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

        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <input type="number" placeholder="Filament Used (grams)" className="p-3 rounded bg-gray-800" onChange={(e)=>setFilamentUsed(Number(e.target.value))}/>
          <input type="number" placeholder="Filament Price per KG" className="p-3 rounded bg-gray-800" onChange={(e)=>setFilamentPricePerKg(Number(e.target.value))}/>
          <input type="number" placeholder="Print Time (hours)" className="p-3 rounded bg-gray-800" onChange={(e)=>setPrintTimeHours(Number(e.target.value))}/>
          <input type="number" placeholder="Electricity Rate (per kWh)" className="p-3 rounded bg-gray-800" onChange={(e)=>setElectricityRate(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Power (Watts)" className="p-3 rounded bg-gray-800" onChange={(e)=>setMachinePowerWatts(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Cost Per Hour" className="p-3 rounded bg-gray-800" onChange={(e)=>setMachineCostPerHour(Number(e.target.value))}/>
          <input type="number" placeholder="Packaging Cost" className="p-3 rounded bg-gray-800" onChange={(e)=>setPackagingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Shipping Cost" className="p-3 rounded bg-gray-800" onChange={(e)=>setShippingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Profit Margin %" defaultValue={30} className="p-3 rounded bg-gray-800" onChange={(e)=>setProfitMargin(Number(e.target.value))}/>
          <input type="number" placeholder="GST %" className="p-3 rounded bg-gray-800" onChange={(e)=>setGstPercent(Number(e.target.value))}/>
        </div>

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
          </div>
        </div>

        <div className="mt-10 p-6 bg-gray-900 rounded-xl border border-gray-700 max-w-xl mx-auto">

          <h2 className="text-xl font-bold text-green-400 mb-3">
            🔥 LayerLedger Pro Coming Soon
          </h2>

          <input
            type="email"
            placeholder="Enter your email"
            value={waitlistEmail}
            onChange={(e)=>setWaitlistEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
          />

          <button
            onClick={handleWaitlist}
            disabled={joining}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join Waitlist"}
          </button>
        </div>
      </div>
    </div>
  );
}