export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-6">
        LayerLedger
      </h1>

      <p className="text-lg text-gray-400 mb-10 text-center max-w-xl">
        Smart Cost & Profit Calculator for 3D Printing Sellers.
        Know your real cost. Price with confidence.
      </p>

      <button className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:opacity-80 transition">
        Launch Calculator
      </button>
    </main>
  );
}