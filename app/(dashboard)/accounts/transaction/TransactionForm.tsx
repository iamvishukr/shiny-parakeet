"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type {
  CreditTransactionItem,
  DebitTransactionItem,
  TransactionItem,
  UserDoc,
} from "./types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
}

type TransactionKeys = keyof CreditTransactionItem | keyof DebitTransactionItem;

const months = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const years = Array.from({ length: 5 }, (_, i) => `${new Date().getFullYear() - i}`);

const defaultCredit: CreditTransactionItem = {
  id: crypto.randomUUID(),
  type: "credit",
  status: "credit",

  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  purpose: "",

  mode: "cash",
  sourceType: "project",
  sourceValue: "",

  createdAt: new Date(),
};

const defaultDebit: DebitTransactionItem = {
  id: crypto.randomUUID(),
  type: "debit",
  status: "debit",
  mode: "cash",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  purpose: "",

  debitType: "employee_salary",
  createdAt: new Date(),
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionItem | null;
  projects: Project[];
  onSubmit: (data: TransactionItem) => void;
  employees: UserDoc[];
}

export default function TransactionModal({
  open,
  onOpenChange,
  transaction,
  projects,
  onSubmit,
  employees,
}: Props) {
  const isEditMode = !!transaction;

  const [form, setForm] = useState<TransactionItem>(defaultCredit);

  useEffect(() => {
    if (transaction) {
      setForm(transaction);
    } else {
      setForm(defaultCredit);
    }
  }, [transaction, open]);

  const handleChange = (field: TransactionKeys, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value } as TransactionItem));
  };

  const handleSubmit = () => {
    // COMMON VALIDATIONS
    if (!form.amount || form.amount <= 0) {
      toast.error("Amount is required");
      return;
    }

    if (!form.date) {
      toast.error("Date is required");
      return;
    }

    if (!form.mode) {
      toast.error("Mode is required");
      return;
    }

    if (form.mode === "online" && !form.utr?.trim()) {
      toast.error("UTR is required for online payments");
      return;
    }

    // -------------------------
    // VALIDATION FOR CREDIT
    // -------------------------
    if (form.type === "credit") {
      if (!form.sourceType) {
        toast.error("Credit source is required");
        return;
      }

      if (form.sourceType === "project" && !form.sourceValue) {
        toast.error("Project is required");
        return;
      }

      if (form.sourceType === "other" && !form.sourceValue?.trim()) {
        toast.error("Source name is required");
        return;
      }
    }

    // -------------------------
    // VALIDATION FOR DEBIT
    // -------------------------
    if (form.type === "debit") {
      if (!form.debitType) {
        toast.error("Debit type is required");
        return;
      }

      // EMPLOYEE SALARY
      if (form.debitType === "employee_salary") {
        if (!form.selectedEmployeeIds || !form.selectedEmployeeIds[0]) {
          toast.error("Employee selection is required");
          return;
        }

        if (!form.salaryMonth || !form.salaryYear) {
          toast.error("Salary month and year are required");
          return;
        }
      }

      // PROJECT
      if (form.debitType === "project") {
        if (!form.sourceValue) {
          toast.error("Project is required");
          return;
        }
      }
    }
    onSubmit(form);
    onOpenChange(false);
  };

  useEffect(() => {
    if (form.type == "debit" && form.debitType === "employee_salary") {
      setForm((prev) => ({
        ...prev,
        sourceValue: employees.find((e) => e.uId=== form.selectedEmployeeIds)?.name || "",
      }));
    }
  }, [form.type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="mb-1 block">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  if (v === "credit") setForm(defaultCredit);
                  else setForm(defaultDebit);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">Amount</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.amount === null ? "" : form.amount}
                onChange={(e) => {
                  const value = e.target.value;

                  if (value === "") {
                    handleChange("amount", "");
                    return;
                  }

                  if (/^[0-9]+$/.test(value)) {
                    handleChange("amount", Number(value));
                  }
                }}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <Label className="mb-1 block">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                disabled={isEditMode}
              />
            </div>

            <div>
              <Label className="mb-1 block">Mode</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => handleChange("mode", v as "cash" | "online")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">UTR</Label>
              <Input
                disabled={form.mode === "cash"}
                value={form.utr || ""}
                onChange={(e) => handleChange("utr", e.target.value)}
                placeholder="Enter UTR"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Note / Purpose</Label>
            <Input
              value={form.purpose}
              onChange={(e) => handleChange("purpose", e.target.value)}
              placeholder="Enter purpose or note for this transaction"
              required
            />
          </div>

          {form.type === "credit" && (
            <div className="rounded-lg border p-4 space-y-6 bg-muted/20">
              <h3 className="font-semibold text-sm">Credit Details</h3>
              <div>
                <Label className="mb-1 block">Credit Source</Label>
                <Select
                  value={form.sourceType}
                  onValueChange={(v) => handleChange("sourceType", v as "project" | "other")}
                  disabled={isEditMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">From Project</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.sourceType === "other" && (
                <div>
                  <Label className="mb-1 block">Other Source</Label>
                  <Input
                    value={form.sourceValue || ""}
                    onChange={(e) => handleChange("sourceValue", e.target.value)}
                    placeholder="Enter source name"
                    disabled={isEditMode}
                  />
                </div>
              )}

              {form.sourceType === "project" && (
                <div>
                  <Label className="mb-1 block">Select Project</Label>
                  <Select
                    value={form.sourceValue || ""}
                    onValueChange={(v) => handleChange("sourceValue", v)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {form.type === "debit" && (
            <div className="rounded-lg border p-4 space-y-6 bg-muted/20">
              <h3 className="font-semibold text-sm">Debit Details</h3>

              <div>
                <Label className="mb-1 block">Debit Type</Label>
                <Select
                  value={form.debitType}
                  onValueChange={(v) =>
                    handleChange("debitType", v as "employee_salary" | "office_saman" | "project")
                  }
                  disabled={isEditMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select debit type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee_salary">Employee Salary</SelectItem>
                    <SelectItem value="project">To Project</SelectItem>
                    <SelectItem value="office_saman">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.debitType === "employee_salary" && (
                <>
                  <div>
                    <Label className="mb-1 block">Select Employees</Label>
                    <Select
                      value={form.selectedEmployeeIds}
                      onValueChange={(v) => handleChange("selectedEmployeeIds", v)}
                      disabled={isEditMode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.uId} value={emp.uId}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">Salary Month</Label>
                    <Select
                      value={form.salaryMonth}
                      onValueChange={(v) => handleChange("salaryMonth", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1 block">Salary Year</Label>
                    <Select
                      value={form.salaryYear}
                      onValueChange={(v) => handleChange("salaryYear", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {form.debitType === "project" && (
                <div>
                  <Label className="mb-1 block">Select Project</Label>
                  <Select
                    value={form.sourceValue || ""}
                    onValueChange={(v) => handleChange("sourceValue", v)}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {isEditMode ? "Save Changes" : "Add Transaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
