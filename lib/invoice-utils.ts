// Utility functions for invoice calculations and formatting
import type { InvoiceLineItem } from "./invoice-types"

export function calculateLineItemTotal(item: InvoiceLineItem): number {
  return item.quantity * item.rate
}

export function calculateLineItemCGST(item: InvoiceLineItem): number {
  if (item.taxType === "IGST") return 0
  const subtotal = calculateLineItemTotal(item)
  return (subtotal * item.gstRate) / 2 / 100
}

export function calculateLineItemSGST(item: InvoiceLineItem): number {
  if (item.taxType === "IGST") return 0
  const subtotal = calculateLineItemTotal(item)
  return (subtotal * item.gstRate) / 2 / 100
}

export function calculateLineItemIGST(item: InvoiceLineItem): number {
  if (item.taxType !== "IGST") return 0
  const subtotal = calculateLineItemTotal(item)
  return (subtotal * item.gstRate) / 100
}

export function calculateLineItemTax(item: InvoiceLineItem): number {
  if (item.taxType === "IGST") return calculateLineItemIGST(item)
  return calculateLineItemCGST(item) + calculateLineItemSGST(item)
}

export function calculateLineItemTotalWithTax(item: InvoiceLineItem): number {
  const subtotal = calculateLineItemTotal(item)
  const tax = calculateLineItemTax(item)
  return subtotal + tax
}

export function calculateSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((total, item) => total + calculateLineItemTotal(item), 0)
}

export function calculateTotalCGST(items: InvoiceLineItem[]): number {
  return items.reduce((total, item) => total + calculateLineItemCGST(item), 0)
}

export function calculateTotalSGST(items: InvoiceLineItem[]): number {
  return items.reduce((total, item) => total + calculateLineItemSGST(item), 0)
}

export function calculateTotalIGST(items: InvoiceLineItem[]): number {
  return items.reduce((total, item) => total + calculateLineItemIGST(item), 0)
}

export function calculateTotalTax(items: InvoiceLineItem[]): number {
  return calculateTotalCGST(items) + calculateTotalSGST(items) + calculateTotalIGST(items)
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return (subtotal * taxRate) / 100
}

export function calculateTotal(subtotal: number, gstRate: number): number {
  return subtotal + calculateTax(subtotal, gstRate)
}

export function groupItemsByHSNAndGST(items: InvoiceLineItem[]) {
  const groups = new Map<string, { hsn: string; gstRate: number; taxType: "GST" | "IGST"; taxableValue: number; cgst: number; sgst: number; igst: number }>()

  items.forEach((item) => {
    const key = `${item.hsn}-${item.gstRate}-${item.taxType}`
    const subtotal = calculateLineItemTotal(item)
    const cgst = calculateLineItemCGST(item)
    const sgst = calculateLineItemSGST(item)
    const igst = calculateLineItemIGST(item)

    if (groups.has(key)) {
      const existing = groups.get(key)!
      existing.taxableValue += subtotal
      existing.cgst += cgst
      existing.sgst += sgst
      existing.igst += igst
    } else {
      groups.set(key, {
        hsn: item.hsn,
        gstRate: item.gstRate,
        taxType: item.taxType,
        taxableValue: subtotal,
        cgst,
        sgst,
        igst,
      })
    }
  })

  return Array.from(groups.values())
}

export function numberToWords(num: number): string {
  if (isNaN(num)) return "";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine"
  ];

  const teens = [
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty",
    "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const scales = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero Only";

  const [integerPart, decimalPart] = num.toFixed(2).split(".");
  let n = parseInt(integerPart, 10);

  function convertBelow1000(n: number): string {
    let str = "";

    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }

    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    } else if (n >= 10) {
      str += teens[n - 10] + " ";
      n = 0;
    }

    if (n > 0) {
      str += ones[n] + " ";
    }

    return str.trim();
  }

  let result = "";
  let scaleIndex = 0;

  // ✅ Last 3 digits first
  const lastThree = n % 1000;
  result = convertBelow1000(lastThree);
  n = Math.floor(n / 1000);

  // ✅ Then 2-digit grouping
  while (n > 0) {
    const chunk = n % 100;
    if (chunk !== 0) {
      result =
        convertBelow1000(chunk) +
        " " +
        scales[++scaleIndex] +
        " " +
        result;
    } else {
      scaleIndex++;
    }
    n = Math.floor(n / 100);
  }

  // ✅ Decimal (Paise)
  let paise = "";
  const decimalNum = parseInt(decimalPart, 10);
  if (decimalNum > 0) {
    paise = " and " + convertBelow1000(decimalNum) + " Paise";
  }

  return result.trim() + paise + " Only";
}


export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}
