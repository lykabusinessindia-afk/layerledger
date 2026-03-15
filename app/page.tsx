import type { Metadata } from "next";
import HomePageClient from "@/app/home-page-client";

export const metadata: Metadata = {
  title: "LayerLedger – 3D Printing Cost Calculator & Instant Quote Tool",
  description:
    "LayerLedger helps 3D printing businesses calculate filament usage, print time, and pricing instantly from STL, OBJ, or 3MF files.",
};

export default function Home() {
  return <HomePageClient />;
}
