"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import { Shoot, shootInitialState } from "./types";
import { firestore } from "@/lib/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

interface AddShootModalProps {
  shoot?: Shoot | null;
  open: boolean;
  onOpenChange?: () => void;
}

function AddShootModal({ shoot, open, onOpenChange }: AddShootModalProps) {
  const [form, setForm] = useState(shootInitialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (shoot) {
      setForm({
        name: shoot.name ?? "",
        traditionalPhotographer: shoot.traditionalPhotographer ?? "0",
        traditionalVideographer: shoot.traditionalVideographer ?? "0",
        candid: shoot.candid ?? "0",
        cinemetographer: shoot.cinemetographer ?? "0",
        assistant: shoot.assistant ?? "0",
        drone: shoot.drone ?? "0",
        other: shoot.other ?? "0",
      });
    } else {
      setForm(shootInitialState);
    }
    // Clear errors when modal opens/closes or shoot changes
    setErrors({});
  }, [shoot, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Store all values as strings (don't convert to number)
    setForm({ ...form, [name]: value });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    // Numeric fields validation - optional
    const numericFields = [
      "traditionalPhotographer",
      "traditionalVideographer",
      "candid",
      "cinemetographer",
      "assistant",
      "drone",
      "other",
    ];

    numericFields.forEach((field) => {
      const value = form[field as keyof typeof form];
      if (value && value.trim() !== "") {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue < 0) {
          newErrors[field] = `Please enter a valid number (0 or higher)`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalize = (value: string) => {
    console.log(value)
    return value.trim() === "" ? "0" : value;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate only filled fields
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setIsSubmitting(true);
    const isEdit = Boolean(shoot);
    const docId = shoot?.shootId;

    try {
      // Prepare data - convert empty strings to 0 for numeric fields
      const submitData = {
        name: form.name.trim(),
        traditionalPhotographer: normalize(form.traditionalPhotographer),
        traditionalVideographer: normalize(form.traditionalVideographer),
        candid: normalize(form.candid),
        cinemetographer: normalize(form.cinemetographer),
        assistant: normalize(form.assistant),
        drone: normalize(form.drone),
        other: normalize(form.other),
      };

      if (isEdit && docId) {
        const ref = doc(firestore, "shoots", docId);
        await setDoc(ref, { ...submitData }, { merge: true });
      } else {
        await addDoc(collection(firestore, "shoots"), {
          ...submitData,
          createdAt: serverTimestamp(),
        });
      }
      toast.success(isEdit ? "Shoot updated" : "Shoot added");
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving shoot:", error);
      toast.error("Failed to save shoot");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{shoot ? "Edit Shoot" : "Add Shoot"}</DialogTitle>
        </DialogHeader>

        {/* Scrollable form container */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4 pr-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Enter shoot name"
                value={form.name}
                className={errors.name ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="traditionalPhotographer" className="text-sm font-medium">
                Traditional Photographer
              </label>
              <Input
                id="traditionalPhotographer"
                name="traditionalPhotographer"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.traditionalPhotographer}
                className={errors.traditionalPhotographer ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.traditionalPhotographer && (
                <p className="text-red-500 text-sm">{errors.traditionalPhotographer}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="traditionalVideographer" className="text-sm font-medium">
                Traditional Videographer
              </label>
              <Input
                id="traditionalVideographer"
                name="traditionalVideographer"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.traditionalVideographer}
                className={errors.traditionalVideographer ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.traditionalVideographer && (
                <p className="text-red-500 text-sm">{errors.traditionalVideographer}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="candid" className="text-sm font-medium">
                Candid
              </label>
              <Input
                id="candid"
                name="candid"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.candid}
                className={errors.candid ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.candid && <p className="text-red-500 text-sm">{errors.candid}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="cinemetographer" className="text-sm font-medium">
                Cinematographer
              </label>
              <Input
                id="cinemetographer"
                name="cinemetographer"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.cinemetographer}
                className={errors.cinemetographer ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.cinemetographer && (
                <p className="text-red-500 text-sm">{errors.cinemetographer}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="assistant" className="text-sm font-medium">
                Assistant
              </label>
              <Input
                id="assistant"
                name="assistant"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.assistant}
                className={errors.assistant ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.assistant && <p className="text-red-500 text-sm">{errors.assistant}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="drone" className="text-sm font-medium">
                Drone Operator
              </label>
              <Input
                id="drone"
                name="drone"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.drone}
                className={errors.drone ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.drone && <p className="text-red-500 text-sm">{errors.drone}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="other" className="text-sm font-medium">
                Other
              </label>
              <Input
                id="other"
                name="other"
                placeholder="Enter number (optional)"
                type="text"
                inputMode="numeric"
                value={form.other}
                className={errors.other ? "border-red-500" : ""}
                onChange={handleChange}
              />
              {errors.other && <p className="text-red-500 text-sm">{errors.other}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddShootModal;
