"use client";

import { ColumnDef } from "@tanstack/react-table";
import { TransactionItem } from "./types";
import { format } from "date-fns";
import { Edit3, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper function to convert amount to words
const amountToWords = (amount: number): string => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (amount === 0) return "Zero Rupees";

  let words = "";

  // Handle rupees part
  let rupees = Math.floor(amount);

  if (rupees >= 10000000) {
    words += convertCrores(rupees) + " Crore ";
    rupees %= 10000000;
  }

  if (rupees >= 100000) {
    words += convertLakhs(rupees) + " Lakh ";
    rupees %= 100000;
  }

  if (rupees >= 1000) {
    words += convertThousands(rupees) + " Thousand ";
    rupees %= 1000;
  }

  if (rupees >= 100) {
    words += convertHundreds(rupees) + " Hundred ";
    rupees %= 100;
  }

  if (rupees > 0) {
    if (words !== "") words += "and ";
    words += convertTensAndOnes(rupees);
  }

  words += " Rupees";

  // Handle paise part if needed
  const paise = Math.round((amount - Math.floor(amount)) * 100);
  if (paise > 0) {
    words += " and " + convertTensAndOnes(paise) + " Paise";
  }

  return words + " Only";

  function convertCrores(num: number): string {
    const crore = Math.floor(num / 10000000);
    return convertNumber(crore);
  }

  function convertLakhs(num: number): string {
    const lakh = Math.floor(num / 100000);
    return convertNumber(lakh);
  }

  function convertThousands(num: number): string {
    const thousand = Math.floor(num / 1000);
    return convertNumber(thousand);
  }

  function convertHundreds(num: number): string {
    const hundred = Math.floor(num / 100);
    return convertNumber(hundred);
  }

  function convertTensAndOnes(num: number): string {
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
  }

  function convertNumber(num: number): string {
    if (num === 0) return "";
    if (num < 100) return convertTensAndOnes(num);

    let words = "";
    if (num >= 100) {
      words += ones[Math.floor(num / 100)] + " Hundred";
      num %= 100;
      if (num > 0) words += " and ";
    }
    if (num > 0) {
      words += convertTensAndOnes(num);
    }
    return words;
  }
};

// Bill generation function with direct print
const generateBillPDF = (
  transaction: TransactionItem,
  projects: Array<{ id: string; name: string }>
) => {
  // Create a hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  // Find project name if applicable
  const projectName =
    transaction.type === "credit" && transaction.sourceType === "project"
      ? projects.find((p) => p.id === transaction.sourceValue)?.name
      : null;

  const billContent = `
    <!DOCTYPE html>
<html>
<head>
  <title>Bill - ${transaction.id || "Transaction"}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body { 
      font-family: "Segoe UI", Arial, sans-serif; 
      margin: 40px; 
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
    }

    /* HEADER */
    .header { 
      text-align: center; 
      margin-bottom: 30px;
      border-bottom: 2px solid #111827;
      padding-bottom: 16px;
    }

    .company-name {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .company-details {
      font-size: 14px;
      color: #4b5563;
    }

    /* TITLE */
    .bill-title {
      text-align: center;
      font-size: 20px;
      font-weight: 600;
      margin: 24px 0;
      padding: 10px;
      border: 1px solid #d1d5db;
      background: #f9fafb;
      letter-spacing: 1px;
    }

    /* DETAILS TABLE */
    .bill-details {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0 30px;
      font-size: 14px;
    }

    .bill-details tr {
      border-bottom: 1px solid #e5e7eb;
    }

    .bill-details td {
      padding: 10px 12px;
      vertical-align: top;
    }

    .bill-details td:first-child {
      width: 30%;
      font-weight: 600;
      color: #374151;
      background: #f9fafb;
    }

    /* AMOUNT BOX */
    .amount-section {
      text-align: center;
      margin: 30px 0;
      padding: 24px;
      background: #f3f4f6;
      border-radius: 10px;
      border: 1px solid #d1d5db;
    }

    .amount-label {
      font-size: 15px;
      color: #374151;
      margin-bottom: 6px;
    }

    .amount {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin: 6px 0;
    }

    .amount-words {
      font-size: 14px;
      color: #4b5563;
      font-style: italic;
    }

    /* SIGNATURES */
    .signature-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }

    .signature-box {
      text-align: center;
      width: 220px;
    }

    .signature-line {
      border-top: 1px solid #111827;
      padding-top: 6px;
      font-size: 13px;
      color: #374151;
    }

    /* FOOTER */
    .footer {
      margin-top: 50px;
      text-align: center;
      border-top: 1px dashed #d1d5db;
      padding-top: 16px;
      font-size: 12px;
      color: #6b7280;
    }

    /* PRINT SETTINGS */
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
      @page {
        size: A4;
        margin: 20mm;
      }
    }
  </style>
</head>

<body onload="window.print(); window.close();">

  <!-- HEADER -->
  <div class="header">
    <div class="company-name">Studio 7</div>
    <div class="company-details">
      D2, Urmila Ray Complex, Circular Rd, Lalpur<br/>
      Ranchi, Jharkhand<br/>
      Phone: +91 77620806044 | Email: photo.studio7@gmail.com
    </div>
  </div>

  <!-- TITLE -->
  <div class="bill-title">
    ${transaction.type === "credit" ? "PAYMENT RECEIPT" : "PAYMENT VOUCHER"}
  </div>

  <!-- DETAILS -->
  <table class="bill-details">
    <tr>
      <td>Bill No</td>
      <td>${transaction.id || "N/A"}</td>
    </tr>
    <tr>
      <td>Date</td>
      <td>${new Date(transaction.date).toLocaleDateString("en-GB")}</td>
    </tr>
    <tr>
      <td>Transaction Type</td>
      <td>${transaction.type.toUpperCase()}</td>
    </tr>
    <tr>
      <td>Purpose</td>
      <td>${transaction.purpose || "N/A"}</td>
    </tr>

    ${projectName
      ? `
    <tr>
      <td>Project</td>
      <td>${projectName}</td>
    </tr>
    `
      : ""
    }

    <tr>
      <td>Entity</td>
      <td>${transaction.sourceValue}</td>
    </tr>

    ${transaction.mode
      ? `
    <tr>
      <td>Payment Mode</td>
      <td>${transaction.mode.toUpperCase()}</td>
    </tr>
    `
      : ""
    }

    ${transaction.utr
      ? `
    <tr>
      <td>UTR Number</td>
      <td>${transaction.utr}</td>
    </tr>
    `
      : ""
    }
  </table>

  <!-- AMOUNT -->
  <div class="amount-section">
    <div class="amount-label">
      ${transaction.type === "credit" ? "Amount Received" : "Amount Paid"}
    </div>
    <div class="amount">₹ ${transaction.amount}</div>
    <div class="amount-words">${amountToWords(transaction.amount)}</div>
  </div>

  <!-- SIGNATURE -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Prepared By</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Authorized Signature</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>This is a computer generated document.</div>
    <div>Generated on: ${new Date().toLocaleDateString("en-GB")}</div>
  </div>

</body>
</html>

  `;

  // Write content to iframe
  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(billContent);
    iframeDoc.close();
  }

  // Clean up iframe after printing
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
};

interface GetTransactionColumnsProps {
  onEdit: (transaction: TransactionItem) => void;
  projects: Array<{ id: string; name: string }>;
}

export const getTransactionColumns = ({
  onEdit,
  projects,
}: GetTransactionColumnsProps): ColumnDef<TransactionItem>[] => [
    {
      accessorKey: "Sl No",
      header: "Sl No",
      cell: (info) => info.row.index + 1,
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: (info) => {
        const value = info.getValue();
        return value ? new Date(value as string).toLocaleDateString("en-GB") : "-";
      },
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;

        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId);

        if (!cellValue) return false;

        // `date` is already YYYY-MM-DD
        const txnDate = new Date(cellValue as string);

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && txnDate < start) return false;
        if (end && txnDate > end) return false;

        return true;
      },
    },
    {
      accessorKey: "type",
      header: "Transaction Type",
      cell: ({ row }) => row.original.type,
    },
    {
      accessorKey: "purpose",
      header: "Note",
      cell: ({ row }) => row.original.purpose || "-",
    },
    {
      accessorKey: "sourceValue",
      header: "Entity",
      cell: ({ row }) => {
        const transaction = row.original;

        // For credit transactions with project source type
        if (transaction.type === "credit" && transaction.sourceType === "project") {
          // Find project name by ID
          const project = projects.find((p) => p.id === transaction.sourceValue);
          return project ? project.name : transaction.sourceValue;
        }
        if (transaction.type === "debit" && transaction.debitType === "project") {
          // Find project name by ID
          const project = projects.find((p) => p.id === transaction.sourceValue);
          return project ? project.name : transaction.sourceValue;
        }

        // For other cases, return the original sourceValue
        return transaction.sourceValue;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const t = row.original;
        const isCredit = t.type === "credit";
        return (
          <span
            className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 w-fit shadow-md ${isCredit ? "text-black bg-green-100" : "text-red-700 bg-red-100"
              }`}
          >
            ₹{t.amount}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
        return <div>{d ? format(d as Date, "dd/MM/yyyy HH:mm") : "-"}</div>;
      },
    },
    {
      id: "detail",
      header: "Detail",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "credit") {
          return t.mode === "online" ? `Online (UTR: ${t.utr || "-"})` : "Cash";
        }
        if (t.type === "debit") {
          if (t.debitType === "employee_salary") {
            return `Salary for 1 employee`;
          } else if (t.mode === "online") {
            return `Online (UTR: ${t.utr || "-"})`
          }
          return "Cash";
        }
        return "-";
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(transaction)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateBillPDF(transaction, projects)}
              className="h-8 w-8 p-0"
              title="Print Bill"
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
