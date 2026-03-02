export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-green-400">
          Terms of Service
        </h1>

        <p>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <p>
          By using LayerLedger, you agree to the following terms.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Use of Service</h2>
        <p className="text-gray-300">
          LayerLedger provides cost estimation tools for 3D printing sellers.
          You are responsible for how you use the calculations and pricing results.
        </p>

        <h2 className="text-2xl font-semibold mt-6">No Financial or Legal Advice</h2>
        <p className="text-gray-300">
          LayerLedger does not provide financial, accounting, or tax advice.
          Users are responsible for verifying pricing, GST, and compliance
          with local laws.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Limitation of Liability</h2>
        <p className="text-gray-300">
          We are not responsible for any business losses, incorrect pricing,
          tax miscalculations, or damages resulting from use of this platform.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Changes</h2>
        <p className="text-gray-300">
          We may update these terms at any time. Continued use of the service
          means you accept the updated terms.
        </p>
      </div>
    </div>
  );
}