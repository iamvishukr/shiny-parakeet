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
import { Event } from "./types";
import { firestore } from "@/lib/firebase";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "sonner";

interface AddEventModalProps {
  event?: Event | null;
  open: boolean;
  onOpenChange?: () => void;
}

function AddEventModal({
  event,
  open,
  onOpenChange,
}: AddEventModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (event) {
      setName(event.name);
    } else {
      setName("");
    }
    // Clear error when modal opens/closes or event changes
    setError("");
  }, [event, open]);

  const validateForm = () => {
    if (!name.trim()) {
      setError("Event name is required");
      return false;
    } else if (name.trim().length < 5) {
      setError("Event name must be at least 5 characters");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    // Validate field
    if (!validateForm()) {
      return;
    }

    const isEdit = Boolean(event);
    const docId = event?.eventId;

    try {
      if (isEdit && docId) {
        const ref = doc(firestore, "events", docId);
        await setDoc(ref, { name }, { merge: true });
      } else {
        await addDoc(collection(firestore, "events"), {
          name,
          createdAt: serverTimestamp(),
        });
      }

      toast.success(isEdit ? "Event updated" : "Event added");
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {event ? "Edit Event" : "Add Event"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="Event Name *"
              value={name}
              className={error ? "border-red-500" : ""}
              onChange={(e) => {
                setName(e.target.value);
                // Clear error when user starts typing
                if (error) {
                  setError("");
                }
              }}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {name.trim() && name.trim().length < 5 && (
              <p className="text-orange-500 text-sm">
                {5 - name.trim().length} characters remaining
              </p>
            )}
          </div>
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

export default AddEventModal;