export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-green-400">
          Privacy Policy
        </h1>

        <p>
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <p>
          LayerLedger respects your privacy. This Privacy Policy explains how we collect,
          use, and protect your information.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Information We Collect</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>Email address (for login and waitlist)</li>
          <li>Feedback you voluntarily submit</li>
          <li>Basic usage data to improve our service</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">How We Use Your Information</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-300">
          <li>To provide and improve LayerLedger</li>
          <li>To communicate updates about the platform</li>
          <li>To enhance user experience</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-6">Data Protection</h2>
        <p className="text-gray-300">
          We store your data securely using trusted third-party services.
          We do not sell or share your personal information with third parties.
        </p>

        <h2 className="text-2xl font-semibold mt-6">Contact</h2>
        <p className="text-gray-300">
          If you have any questions about this Privacy Policy, please contact us at:
          support@lyka3dstudio.com
        </p>
      </div>
    </div>
  );
}