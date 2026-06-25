"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  useReactTable,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { firestore } from "@/lib/firebase";
import { GenericTable } from "@/components/shared/GenericTable";
import { InvoiceTemplate } from "@/components/invoice-template";
import { InvoiceData } from "@/lib/invoice-types";
import { useRouter } from "next/navigation";
import Pagination from "@/components/shared/Pagination";
import TableActions from "@/components/shared/TableActions";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const router = useRouter();

  // ------------------------------------------
  // PRINT FUNCTION
  // ------------------------------------------
  const handlePrintPDF = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);

    setTimeout(() => {
      const element = printRef.current;
      if (!element) return;

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #000;
                background-color: #fff;
              }
            </style>
          </head>
          <body>${element.innerHTML}</body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }, 50);
  };

  const handleEdit = (invoice: InvoiceData) => {
    router.push(`/invoice?id=${invoice.invoiceNo}`);
  };

  // ------------------------------------------
  // FETCH FIRESTORE INVOICES
  // ------------------------------------------
  useEffect(() => {
    const fetchInvoices = async () => {
      const snap = await getDocs(collection(firestore, "invoices"));
      setInvoices(snap.docs.map((doc) => doc.data() as InvoiceData));
    };
    fetchInvoices();
  }, []);

  // ------------------------------------------
  // TABLE COLUMNS
  // ------------------------------------------
  const columnHelper = createColumnHelper<InvoiceData>();

  const columns = [
    columnHelper.accessor("invoiceNo", {
      header: "Invoice No",
    }),

    columnHelper.accessor((row) => row.consignee.name, {
      id: "consigneeName",
      header: "Consignee",
    }),

    columnHelper.accessor("invoiceDate", {
      header: "Date",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),

    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handlePrintPDF(row.original)}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.invoiceNo,
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Invoices</h1>
      <TableActions
        table={table}
        data={invoices}
        searchPlaceholder="Filter invoices..."
        searchParam="invoiceNo"
      />
      <GenericTable table={table} />
      <Pagination table={table} />

      {/* 
        Hidden printable template area 
        This renders the React component normally,
        so we can extract the HTML and print it.
      */}
      <div ref={printRef} style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
        {selectedInvoice && <InvoiceTemplate data={selectedInvoice} />}
      </div>
    </div>
  );
}
