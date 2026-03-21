import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-3xl border border-white/10 shadow-xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-6">Terms of Service</h1>

        <p className="text-gray-300 leading-relaxed mb-4">
          Orders are processed after successful payment confirmation.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Custom 3D prints are non-refundable once production has started.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Delivery timelines may vary depending on production complexity and logistics.
        </p>
        <p className="text-gray-300 leading-relaxed mb-4">
          Users are responsible for the STL files they upload, including ownership and permissions.
        </p>

        <div className="mt-8 pt-6 border-t border-white/10 flex gap-3">
          <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition">
            Privacy Policy
          </Link>
          <span className="text-gray-500">|</span>
          <Link href="/terms-of-service" className="text-gray-400 hover:text-white transition">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
