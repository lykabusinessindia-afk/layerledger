import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "LayerLedger",
  description: "3D Printing Profit Calculator",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}

        <footer className="text-center text-gray-800 text-sm py-6 border-t border-gray-300 bg-white">
          <div className="space-x-4">
            <a href="/privacy-policy" className="hover:text-green-400">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-green-400">
              Terms of Service
            </a>
          </div>
        </footer>

        {/* PWA Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />

      </body>
    </html>
  );
}