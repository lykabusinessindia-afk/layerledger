"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Calculator() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [joining, setJoining] = useState(false);

  const [feedback, setFeedback] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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
      if (!data.session) router.push("/login");
      else setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    await installPrompt.userChoice;

    setInstallPrompt(null);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleWaitlist = async () => {
    if (!waitlistEmail) return alert("Enter email");
    setJoining(true);
    await supabase.from("waitlist").insert([{ email: waitlistEmail }]);
    alert("You're on the waitlist 🚀");
    setWaitlistEmail("");
    setJoining(false);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback) return alert("Enter feedback");
    setSubmittingFeedback(true);
    await supabase.from("feedback").insert([{ message: feedback }]);
    alert("Thanks for feedback 🙌");
    setFeedback("");
    setSubmittingFeedback(false);
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
        <div className="relative mb-12">
          <div className="hidden md:block absolute right-0 top-0">
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Sign Out
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
              <span>Layer</span>
              <span className="text-green-400 ml-1">Ledger</span>
            </h1>

            <p className="text-lg md:text-2xl text-gray-300 mt-4 max-w-2xl mx-auto">
              Turn Every 3D Print Into{" "}
              <span className="text-green-500 font-semibold">
                Predictable Profit
              </span>
            </p>

            <p className="text-center text-sm text-gray-400 mt-2">
Built by <a href="https://lyka3dstudio.com" className="underline">LYKA3DStudio</a>
</p>

            <div className="mt-6 md:hidden">
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg text-sm font-semibold"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* INPUTS */}
        <div className="flex flex-col gap-4 max-w-xl mx-auto">
          <input type="number" placeholder="Filament Used (grams)" className="p-3 rounded bg-gray-800" onChange={(e)=>setFilamentUsed(Number(e.target.value))}/>
          <input type="number" placeholder="Filament Price per KG" className="p-3 rounded bg-gray-800" onChange={(e)=>setFilamentPricePerKg(Number(e.target.value))}/>
          <input type="number" placeholder="Print Time (hours)" className="p-3 rounded bg-gray-800" onChange={(e)=>setPrintTimeHours(Number(e.target.value))}/>
          <input type="number" placeholder="Electricity Rate (per kWh)" className="p-3 rounded bg-gray-800" onChange={(e)=>setElectricityRate(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Power (Watts)" className="p-3 rounded bg-gray-800" onChange={(e)=>setMachinePowerWatts(Number(e.target.value))}/>
          <input type="number" placeholder="Machine Cost Per Hour" className="p-3 rounded bg-gray-800" onChange={(e)=>setMachineCostPerHour(Number(e.target.value))}/>
          <input type="number" placeholder="Packaging Cost" className="p-3 rounded bg-gray-800" onChange={(e)=>setPackagingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Shipping Cost" className="p-3 rounded bg-gray-800" onChange={(e)=>setShippingCost(Number(e.target.value))}/>
          <input type="number" placeholder="Failure Rate %" className="p-3 rounded bg-gray-800" onChange={(e)=>setFailureRate(Number(e.target.value))}/>
          <input type="number" placeholder="Profit Margin %" className="p-3 rounded bg-gray-800" onChange={(e)=>setProfitMargin(Number(e.target.value))}/>
          <input type="number" placeholder="GST %" className="p-3 rounded bg-gray-800" onChange={(e)=>setGstPercent(Number(e.target.value))}/>
        </div>

        {/* COST BREAKDOWN */}
        <div className="mt-14 bg-gray-900 p-6 rounded-xl max-w-xl mx-auto shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>

          <div className="space-y-2 text-gray-300">
            <div className="flex justify-between"><span>Total Production Cost</span><span>₹ {totalCost.toFixed(2)}</span></div>
            <div className="flex justify-between text-green-400"><span>Net Profit</span><span>₹ {profitAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Selling Price (Excl. GST)</span><span>₹ {baseSellingPrice.toFixed(2)}</span></div>
            <div className="flex justify-between text-yellow-400"><span>GST Amount</span><span>₹ {gstAmount.toFixed(2)}</span></div>

            <div className="border-t border-gray-700 my-2"></div>

            <div className="flex justify-between text-green-500 font-bold text-lg">
              <span>Final Selling Price (Incl. GST)</span>
              <span>₹ {sellingPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {installPrompt && (
        <button
          onClick={handleInstall}
          className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold shadow-xl transition-all duration-300 hover:scale-110 animate-pulse"
          style={{
            boxShadow: "0 0 20px rgba(34,197,94,0.7)"
          }}
        >
          ⬇ Install LayerLedger
        </button>
      )}

    </div>
  );
}
