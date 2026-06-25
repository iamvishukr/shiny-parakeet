import React, { useState } from "react";
import { FormField } from "./FormField";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface Expense {
  amount: number;
  reason: string;
}

interface FinancialSectionProps {
  formData: {
    price: number;
    extraExpenses: Expense[];
    discount: number;
    finalAmount: number;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onInputChange: (field: string, value: any) => void;
}

export function FinancialSection({ formData, onInputChange }: FinancialSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState<Expense>({ amount: 0, reason: "" });

  // ✅ Normalize to prevent "not iterable" errors
  const extraExpensesArray = Array.isArray(formData.extraExpenses) ? formData.extraExpenses : [];

  const totalExtraExpenses = extraExpensesArray.reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );

  // ✅ Add new expense
  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.reason.trim()) return;
    const updatedExpenses = [...extraExpensesArray, newExpense];
    onInputChange("extraExpenses", updatedExpenses);
    setNewExpense({ amount: 0, reason: "" });
    setIsDialogOpen(false);
  };

  // ✅ Delete specific expense
  const handleDeleteExpense = (index: number) => {
    const updatedExpenses = extraExpensesArray.filter((_, i) => i !== index);
    onInputChange("extraExpenses", updatedExpenses);
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Financial Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          label="Price"
          type="number"
          value={formData.price === 0 ? "" : formData.price}
          onChange={(value) => onInputChange("price", value)}
          placeholder="Enter price"
          // min={0}
          required
        />

        <FormField
          label="Discount"
          type="number"
          value={formData.discount === 0 ? "" : formData.discount}
          onChange={(value) => onInputChange("discount", value)}
          placeholder="Enter discount"
          min={0}
        />

        {/* ✅ Extra Expenses with Add + Delete */}
        <div>
          <Label className="text-sm font-medium text-gray-600 flex items-center justify-between">
            Extra Expenses
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Plus className="h-4 w-4 text-gray-600" />
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              >
                <DialogHeader>
                  <DialogTitle>Add Extra Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={newExpense.amount || ""}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          amount: Number(e.target.value),
                        }))
                      }
                      placeholder="Enter amount"
                      min={0}
                    />
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input
                      type="text"
                      value={newExpense.reason}
                      onChange={(e) =>
                        setNewExpense((prev) => ({
                          ...prev,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="Enter reason"
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExpense}>Add</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </Label>

          <p className="text-gray-900 font-semibold mt-1">
            ₹{totalExtraExpenses.toLocaleString("en-IN")}
          </p>

          {/* ✅ List of expenses */}
          {extraExpensesArray.length > 0 && (
            <ul className="mt-2 text-sm text-gray-700 space-y-1">
              {extraExpensesArray.map((exp, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-gray-50 rounded px-2 py-1"
                >
                  <span>
                    ₹{exp.amount} — {exp.reason}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteExpense(i)}
                    title="Delete Expense"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <FormField
          label="Final Amount"
          type="number"
          value={formData.finalAmount}
          onChange={() => {}}
          readOnly
          className="bg-gray-50"
        />
      </div>
    </div>
  );
}
