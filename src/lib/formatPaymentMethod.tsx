import React from "react";

interface PaymentMethodItem {
  metodo: string;
  monto: number;
}

/**
 * Formats the payment method field for display.
 * Handles both simple strings ("efectivo") and JSON arrays of mixed payments.
 */
export function formatPaymentMethod(metodoPago: string | undefined | null): React.ReactNode {
  if (!metodoPago) {
    return "efectivo";
  }

  // Try to parse as JSON array
  const trimmed = metodoPago.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: PaymentMethodItem[] = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium">💰 Pago Mixto:</span>
            {parsed.map((item, idx) => (
              <span key={idx} className="ml-2">
                • {capitalizeFirst(item.metodo)}: ${item.monto.toLocaleString("es-AR")}
              </span>
            ))}
          </div>
        );
      }
    } catch {
      // Not valid JSON, fall through to display as string
    }
  }

  // Simple string payment method
  return capitalizeFirst(metodoPago);
}

/**
 * Returns a simple text version of the payment method (for badges/compact display)
 */
export function formatPaymentMethodText(metodoPago: string | undefined | null): string {
  if (!metodoPago) {
    return "efectivo";
  }

  const trimmed = metodoPago.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: PaymentMethodItem[] = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(item => `${capitalizeFirst(item.metodo)}: $${item.monto.toLocaleString("es-AR")}`).join(" + ");
      }
    } catch {
      // Not valid JSON
    }
  }

  return capitalizeFirst(metodoPago);
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
