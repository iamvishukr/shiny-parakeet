"use client";

import { useEffect, useState } from "react";
import { type InvoiceData, defaultInvoiceData, type InvoiceLineItem } from "@/lib/invoice-types";
import { InvoiceTemplate } from "@/components/invoice-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collection, doc, setDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export default function InvoicePage() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(defaultInvoiceData);
  const [showPreview, setShowPreview] = useState(false);
  const [sameAsBuyer, setSameAsBuyer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const invoiceId = searchParams?.get("id");
    if (invoiceId) {
      const fetchInvoice = async () => {
        setIsLoading(true);
        try {
          const invoicesRef = collection(firestore, "invoices");
          const q = query(invoicesRef, where("invoiceNo", "==", invoiceId));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const invoiceDoc = querySnapshot.docs[0];
            const fetchedData = invoiceDoc.data() as InvoiceData;
            setInvoiceData(fetchedData);
            setIsEditMode(true);
            setOriginalInvoiceNo(fetchedData.invoiceNo);
          } else {
            toast.error("Invoice not found");
            router.push("/");
          }
        } catch (error) {
          console.error("Error fetching invoice:", error);
          toast.error("Error loading invoice");
        } finally {
          setIsLoading(false);
        }
      };
      fetchInvoice();
    }
  }, [searchParams, toast, router]);

  useEffect(() => {
    loadExistingInvoices();
  }, []);

  const loadExistingInvoices = async () => {
    try {
      const invoicesSnapshot = await getDocs(collection(firestore, "invoices"));
      const invoiceNumbers = invoicesSnapshot.docs
        .map((doc) => doc.data().invoiceNo)
        .filter(Boolean);
      setExistingInvoices(invoiceNumbers);
    } catch (error) {
      console.error("Error loading existing invoices:", error);
    }
  };

  const handleCompanyChange = (field: keyof InvoiceData["company"], value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      company: { ...prev.company, [field]: value },
    }));
  };

  const handleConsigneeChange = (field: keyof InvoiceData["consignee"], value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      consignee: { ...prev.consignee, [field]: value },
    }));
  };

  const handleBuyerChange = (field: keyof InvoiceData["buyer"], value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      buyer: { ...prev.buyer, [field]: value },
    }));
  };

  const handleInvoiceDetailChange = (field: keyof InvoiceData, value: string | number) => {
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (sameAsBuyer) {
      setInvoiceData((prev) => ({
        ...prev,
        consignee: { ...prev.buyer },
      }));
    }
  }, [sameAsBuyer, invoiceData.buyer]);

  const validateForm = () => {
    const errors: string[] = [];

    if (!invoiceData.invoiceNo.trim()) errors.push("Invoice number is required");
    if (!invoiceData.invoiceDate) errors.push("Invoice date is required");
    if (!invoiceData.company.name.trim()) errors.push("Company name is required");
    if (!invoiceData.company.gstin.trim()) errors.push("Company GSTIN is required");
    if (!invoiceData.buyer.name.trim()) errors.push("Buyer name is required");
    if (!invoiceData.consignee.name.trim()) errors.push("Consignee name is required");
    if (invoiceData.lineItems.length === 0) errors.push("At least one line item is required");

    const hasInvalidLineItem = invoiceData.lineItems.some(
      (item) => !item.description.trim() || !item.hsn.trim() || item.quantity <= 0 || item.rate <= 0
    );
    if (hasInvalidLineItem)
      errors.push("All line items must have description, HSN, quantity > 0, and rate > 0");

    if (!isEditMode || invoiceData.invoiceNo.trim() !== originalInvoiceNo) {
      if (existingInvoices.includes(invoiceData.invoiceNo.trim())) {
        errors.push("Invoice number already exists");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleSaveInvoice = async () => {
    const validation = validateForm();

    if (!validation.isValid) {
      toast.error(`Please fix the following errors ${validation.errors}`);
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && invoiceData.id) {
        const invoiceWithUpdate = {
          ...invoiceData,
          updatedAt: new Date().toISOString(),
        };

        await updateDoc(doc(firestore, "invoices", invoiceData.id), invoiceWithUpdate);

        toast.success("Invoice updated successfully!");

        router.push("/invoice/view");
      } else {
        const invoiceId = generateId();
        const invoiceWithId = {
          ...invoiceData,
          id: invoiceId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(doc(firestore, "invoices", invoiceId), invoiceWithId);

        setExistingInvoices((prev) => [...prev, invoiceData.invoiceNo.trim()]);

        toast.success("Invoice saved successfully!");
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error(isEditMode ? "Failed to update invoice" : "Failed to save invoice");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: generateId(),
      description: "",
      hsn: "",
      quantity: 1,
      unit: "PCS",
      rate: 0,
      gstRate: 18,
      taxType: "GST",
    };
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  };

  const handleUpdateLineItem = (
    id: string,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleRemoveLineItem = (id: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  };

  const handlePrintPDF = () => {
    const element = document.getElementById("invoice-template");
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
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "1rem" }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
          >
            {isEditMode ? "Edit Invoice" : "Tax Invoice Generator"}
          </h1>
          <p style={{ color: "#4b5563" }}>
            {isEditMode
              ? "Update invoice details"
              : "Create and export professional tax invoices as PDF"}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Invoice No. *
                  </label>
                  <Input
                    value={invoiceData.invoiceNo}
                    onChange={(e) => handleInvoiceDetailChange("invoiceNo", e.target.value)}
                    placeholder="e.g., S7/2025/019"
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Invoice Date *
                  </label>
                  <Input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => handleInvoiceDetailChange("invoiceDate", e.target.value)}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Payment Mode
                  </label>
                  <Input
                    value={invoiceData.paymentMode || ""}
                    onChange={(e) => handleInvoiceDetailChange("paymentMode", e.target.value)}
                    placeholder="e.g., UPI, Bank Transfer"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Company Details *</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Input
                  placeholder="Company Name *"
                  value={invoiceData.company.name}
                  onChange={(e) => handleCompanyChange("name", e.target.value)}
                />
                <Input
                  placeholder="Address *"
                  value={invoiceData.company.address}
                  onChange={(e) => handleCompanyChange("address", e.target.value)}
                />
                <Input
                  placeholder="City *"
                  value={invoiceData.company.city}
                  onChange={(e) => handleCompanyChange("city", e.target.value)}
                />
                <Input
                  placeholder="GSTIN *"
                  value={invoiceData.company.gstin}
                  onChange={(e) => handleCompanyChange("gstin", e.target.value)}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <Input
                    placeholder="State Name *"
                    value={invoiceData.company.stateName}
                    onChange={(e) => handleCompanyChange("stateName", e.target.value)}
                  />
                  <Input
                    placeholder="State Code *"
                    value={invoiceData.company.stateCode}
                    onChange={(e) => handleCompanyChange("stateCode", e.target.value)}
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={invoiceData.company.email}
                  onChange={(e) => handleCompanyChange("email", e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={invoiceData.company.phone || ""}
                  onChange={(e) => handleCompanyChange("phone", e.target.value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Buyer (Bill to) *</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Input
                  placeholder="Name *"
                  value={invoiceData.buyer.name}
                  onChange={(e) => handleBuyerChange("name", e.target.value)}
                />
                <Input
                  placeholder="Address *"
                  value={invoiceData.buyer.address}
                  onChange={(e) => handleBuyerChange("address", e.target.value)}
                />
                <Input
                  placeholder="City *"
                  value={invoiceData.buyer.city}
                  onChange={(e) => handleBuyerChange("city", e.target.value)}
                />
                <Input
                  placeholder="GSTIN *"
                  value={invoiceData.buyer.gstin}
                  onChange={(e) => handleBuyerChange("gstin", e.target.value)}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <Input
                    placeholder="State Name *"
                    value={invoiceData.buyer.stateName}
                    onChange={(e) => handleBuyerChange("stateName", e.target.value)}
                  />
                  <Input
                    placeholder="State Code *"
                    value={invoiceData.buyer.stateCode}
                    onChange={(e) => handleBuyerChange("stateCode", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consignee (Ship to) *</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Input
                  placeholder="Name *"
                  value={invoiceData.consignee.name}
                  disabled={sameAsBuyer}
                  onChange={(e) => handleConsigneeChange("name", e.target.value)}
                />
                <Input
                  placeholder="Address *"
                  value={invoiceData.consignee.address}
                  disabled={sameAsBuyer}
                  onChange={(e) => handleConsigneeChange("address", e.target.value)}
                />
                <Input
                  placeholder="City *"
                  value={invoiceData.consignee.city}
                  disabled={sameAsBuyer}
                  onChange={(e) => handleConsigneeChange("city", e.target.value)}
                />
                <Input
                  placeholder="GSTIN *"
                  value={invoiceData.consignee.gstin}
                  disabled={sameAsBuyer}
                  onChange={(e) => handleConsigneeChange("gstin", e.target.value)}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <Input
                    placeholder="State Name *"
                    value={invoiceData.consignee.stateName}
                    disabled={sameAsBuyer}
                    onChange={(e) => handleConsigneeChange("stateName", e.target.value)}
                  />
                  <Input
                    placeholder="State Code *"
                    value={invoiceData.consignee.stateCode}
                    disabled={sameAsBuyer}
                    onChange={(e) => handleConsigneeChange("stateCode", e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="same-as-buyer"
                    checked={sameAsBuyer}
                    onCheckedChange={(checked) => {
                      setSameAsBuyer(checked === true);

                      if (checked === true) {
                        setInvoiceData((prev) => ({
                          ...prev,
                          consignee: { ...prev.buyer },
                        }));
                      }
                    }}
                  />
                  <Label htmlFor="same-as-buyer">Same as Buyer</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Input
                  placeholder="Account Holder Name"
                  value={invoiceData.accountHolder || ""}
                  onChange={(e) => handleInvoiceDetailChange("accountHolder", e.target.value)}
                />
                <Input
                  placeholder="Bank Name"
                  value={invoiceData.bankName || ""}
                  onChange={(e) => handleInvoiceDetailChange("bankName", e.target.value)}
                />
                <Input
                  placeholder="Account No."
                  value={invoiceData.accountNo || ""}
                  onChange={(e) => handleInvoiceDetailChange("accountNo", e.target.value)}
                />
                <Input
                  placeholder="Branch & IFS Code"
                  value={invoiceData.branchIFSCode || ""}
                  onChange={(e) => handleInvoiceDetailChange("branchIFSCode", e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <Card>
              <CardHeader>
                <CardTitle>Line Items *</CardTitle>
                <CardDescription>Add products/services to invoice</CardDescription>
              </CardHeader>
              <CardContent style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {invoiceData.lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <h4 style={{ fontWeight: "600" }}>Item {index + 1}</h4>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveLineItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    <Input
                      placeholder="Description *"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(item.id, "description", e.target.value)}
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <Input
                        placeholder="HSN/SAC *"
                        value={item.hsn}
                        onChange={(e) => handleUpdateLineItem(item.id, "hsn", e.target.value)}
                      />
                      <Input
                        placeholder="Rate *"
                        type="text"
                        inputMode="decimal"
                        value={item.rate ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;

                          // allow empty
                          if (value === "") {
                            handleUpdateLineItem(item.id, "rate", "");
                            return;
                          }

                          // allow valid decimal typing
                          if (/^\d*\.?\d*$/.test(value)) {
                            handleUpdateLineItem(item.id, "rate", value); // 👈 KEEP AS STRING
                          }
                        }}
                        onBlur={() => {
                          // convert to number only when user finishes typing
                          if ((item.rate as unknown) !== "" && item.rate !== null) {
                            handleUpdateLineItem(item.id, "rate", Number(item.rate));
                          }
                        }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <Input
                        placeholder="Quantity *"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity === null ? "" : item.quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            handleUpdateLineItem(item.id, "quantity", "");
                            return;
                          }
                          if (/^[0-9]+$/.test(value)) {
                            handleUpdateLineItem(
                              item.id,
                              "quantity",
                              Number.parseFloat(e.target.value)
                            );
                          }
                        }}
                      />
                      <Input
                        placeholder="Unit *"
                        value={item.unit}
                        onChange={(e) => handleUpdateLineItem(item.id, "unit", e.target.value)}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <Select
                        value={item.taxType}
                        onValueChange={(val) => handleUpdateLineItem(item.id, "taxType", val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Tax Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GST">GST (CGST + SGST)</SelectItem>
                          <SelectItem value="IGST">IGST</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="GST Rate (%) *"
                        type="text"
                        inputMode="decimal"
                        value={item.gstRate ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            handleUpdateLineItem(item.id, "gstRate", "");
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(value)) {
                            handleUpdateLineItem(item.id, "gstRate", value);
                          }
                        }}
                        onBlur={() => {
                          if ((item.gstRate as unknown) !== "" && item.gstRate !== null) {
                            handleUpdateLineItem(item.id, "gstRate", Number(item.gstRate));
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={handleAddLineItem} variant="outline">
                  + Add Line Item
                </Button>
              </CardContent>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Button onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button onClick={handleSaveInvoice} disabled={isSaving} variant="default">
                {isSaving ? "Saving..." : isEditMode ? "Update Invoice" : "Save Invoice"}
              </Button>
              <Button
                onClick={handlePrintPDF}
                style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
              >
                Print PDF
              </Button>
            </div>

            {showPreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Invoice Preview</CardTitle>
                </CardHeader>
                <CardContent
                  style={{
                    maxHeight: "24rem",
                    overflowY: "auto",
                    backgroundColor: "#f1f5f9",
                    padding: "1rem",
                    borderRadius: "0.5rem",
                  }}
                >
                  <div id="invoice-template">
                    <InvoiceTemplate data={invoiceData} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
