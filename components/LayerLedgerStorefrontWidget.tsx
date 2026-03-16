// Extend window type for Shopify storefront environments
declare global {
  interface Window {
    Shopify?: any;
    ShopifyAnalytics?: any;
  }
}
import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import LayerLedgerWidget from "./LayerLedgerWidget";

export type LayerLedgerStorefrontWidgetProps = {
  shop: string;
  productId: string;
  printerDefault?: string;
  materialDefault?: string;
  className?: string;
};

/**
 * Shopify Storefront Widget Wrapper for LayerLedger
 * Allows merchants to embed the LayerLedger 3D print calculator on their Shopify storefront pages.
 * - Iframe-safe, works in theme app blocks, product pages, custom pages.
 * - Accepts configuration props for shop, productId, printerDefault, materialDefault.
 * - Reuses LayerLedgerWidget logic, does not duplicate calculator code.
 * - Handles Shopify storefront environments (window.Shopify, window.ShopifyAnalytics).
 */
const LayerLedgerStorefrontWidget: React.FC<LayerLedgerStorefrontWidgetProps> = ({
  shop,
  productId,
  printerDefault,
  materialDefault,
  className = "",
}) => {
  // Pass defaults to LayerLedgerWidget
  // (Assumes LayerLedgerWidget supports printer/material defaults via props)
  // If not, add prop support to LayerLedgerWidget

  // Shopify environment detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.Shopify) {
        // Optionally: track widget load, analytics, etc.
      }
      if (window.ShopifyAnalytics) {
        // Optionally: track widget load, analytics, etc.
      }
    }
  }, []);

  // Iframe-safe: avoid window.top access unless needed

  return (
    <div className={className}>
      <LayerLedgerWidget
        className=""
        printerDefault={printerDefault}
        materialDefault={materialDefault}
        shop={shop}
        productId={productId}
      />
    </div>
  );
};

export default LayerLedgerStorefrontWidget;
