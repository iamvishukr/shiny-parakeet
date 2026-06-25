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
import { Deliverable } from "./types";
import { firestore } from "@/lib/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";

interface AddDeliverableModalProps {
  deliverable?: Deliverable | null;
  open: boolean;
  onOpenChange?: () => void;
}

function AddDeliverableModal({ deliverable, open, onOpenChange }: AddDeliverableModalProps) {
  const [name, setName] = useState("");
  // const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{name?: string; description?: string}>({});

  useEffect(() => {
    if (deliverable) {
      setName(deliverable.name);
      // setDescription(deliverable.description ?? "");
    } else {
      setName("");
      // setDescription("");
    }
    // Clear errors when modal opens/closes or deliverable changes
    setErrors({});
  }, [deliverable, open]);

  const validateForm = () => {
    const newErrors: {name?: string; description?: string} = {};

    // Both fields are now optional, no validation needed
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Form validation always passes since all fields are optional
    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    const isEdit = Boolean(deliverable);
    const docId = deliverable?.deliverableId;

    try {
      if (isEdit && docId) {
        const ref = doc(firestore, "deliverables", docId);
        await setDoc(ref, { 
          name: name.trim(), 
          // description: description.trim() 
        }, { merge: true });
      } else {
        await addDoc(collection(firestore, "deliverables"), {
          name: name.trim(),
          // description: description.trim(),
          createdAt: serverTimestamp(),
        });
      }

      toast.success(isEdit ? "Deliverable updated" : "Deliverable added");
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving deliverable:", error);
      toast.error("Failed to save deliverable");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deliverable ? "Edit Deliverable" : "Add Deliverable"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="Deliverable Name"
              value={name}
              className={errors.name ? "border-red-500" : ""}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: "" }));
                }
              }}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>
          
          {/* <div className="space-y-2">
            <Input
              placeholder="Deliverable Description"
              value={description}
              className={errors.description ? "border-red-500" : ""}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors(prev => ({ ...prev, description: "" }));
                }
              }}
            />
            
          </div> */}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddDeliverableModal;