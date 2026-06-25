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
import { Textarea } from "@/components/ui/textarea";
import { Client } from "./types";
import { firestore } from "@/lib/firebase";
import { doc, setDoc, collection, onSnapshot, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import HybridSelect from "@/components/shared/HybridSelect";

interface AddClientModalProps {
  client?: Client | null;
  open: boolean;
  onOpenChange?: () => void;
}

function generateClientId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `client-${result}`;
}

function AddClientModal({ client, open, onOpenChange }: AddClientModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNo: "",
    address: "",
    projectType: "",
    venue: "",
    dateOfEvent: "", // always stored as string
  });

  const [existingClients, setExistingClients] = useState<string[]>([]);
  const [projectTypes, setProjectTypes] = useState<{name: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔹 Real-time listener to clients collection
  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "clients"), (snapshot) => {
      const names = snapshot.docs.map((doc) => doc.data().name?.toLowerCase().trim());
      setExistingClients(names);
    });
    return () => unsub();
  }, []);

  // 🔹 Fetch Project Types from "events" collection (same as Enquiry modal)
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "events"));
        const data = snapshot.docs.map((doc) => ({
          name: doc.data().name,
        }));
        setProjectTypes(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  // Prefill form if editing
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        phoneNo: client.phoneNo,
        address: client.address,
        projectType: client.projectType || "",
        venue: client.venue || "",
        dateOfEvent: client.dateOfEvent || "",
      });
    } else {
      setFormData({
        name: "",
        phoneNo: "",
        address: "",
        projectType: "",
        venue: "",
        dateOfEvent: "",
      });
    }
    // Clear errors when modal opens/closes or client changes
    setErrors({});
  }, [client, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.phoneNo.trim()) {
      newErrors.phoneNo = "Phone number is required";
    } else if (formData.phoneNo.length !== 10) {
      newErrors.phoneNo = "Phone number must be 10 digits";
    }
    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.projectType.trim()) {
      newErrors.projectType = "Project type is required";
    }
    if (!formData.venue.trim()) {
      newErrors.venue = "Venue is required";
    }
    if (!formData.dateOfEvent.trim()) {
      newErrors.dateOfEvent = "Date of event is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate all fields
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }

    const normalizedName = formData.name.toLowerCase().trim();

    // 🔹 Check if name already exists (ignore if editing the same client)
    if (
      existingClients.includes(normalizedName) &&
      normalizedName !== client?.name.toLowerCase().trim()
    ) {
      toast.warning("Client already present");
      return;
    }

    const clientId = client?.clientId || generateClientId();
    try {
      await setDoc(
        doc(firestore, "clients", clientId),
        {
          name: formData.name,
          phoneNo: formData.phoneNo,
          address: formData.address,
          projectType: formData.projectType,
          venue: formData.venue,
          dateOfEvent: formData.dateOfEvent,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success(client ? "Client updated successfully" : "Client added successfully");
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Failed to save client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 🔹 Name */}
          <div className="space-y-2">
            <Input
              placeholder="Name *"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name) {
                  setErrors(prev => ({ ...prev, name: "" }));
                }
              }}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
          </div>

          {/* 🔹 Phone Number */}
          <div className="space-y-2">
            <Input
              placeholder="Phone Number *"
              value={formData.phoneNo}
              type="text"
              maxLength={10}
              pattern="\d*"
              className={errors.phoneNo ? "border-red-500" : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 10) {
                  setFormData((prev) => ({ ...prev, phoneNo: value }));
                  if (errors.phoneNo) {
                    setErrors(prev => ({ ...prev, phoneNo: "" }));
                  }
                }
              }}
            />
            {errors.phoneNo && <p className="text-red-500 text-sm">{errors.phoneNo}</p>}
          </div>

          {/* 🔹 Address */}
          <div className="space-y-2">
            <Textarea
              placeholder="Address *"
              value={formData.address}
              className={errors.address ? "border-red-500" : ""}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, address: e.target.value }));
                if (errors.address) {
                  setErrors(prev => ({ ...prev, address: "" }));
                }
              }}
            />
            {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
          </div>

          {/* 🔹 Project Type Dropdown */}
          <div className="space-y-2">
  <div className={errors.projectType ? "border border-red-500 rounded-md" : ""}>
    <HybridSelect
      label="Project Type *"
      options={projectTypes}
      value={formData.projectType}
      onChange={(val) => {
        setFormData((prev) => ({ ...prev, projectType: val }));
        if (errors.projectType) {
          setErrors(prev => ({ ...prev, projectType: "" }));
        }
      }}
    />
  </div>
  {errors.projectType && <p className="text-red-500 text-sm">{errors.projectType}</p>}
</div>

          {/* 🔹 Venue */}
          <div className="space-y-2">
            <Input
              placeholder="Venue *"
              value={formData.venue}
              className={errors.venue ? "border-red-500" : ""}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, venue: e.target.value }));
                if (errors.venue) {
                  setErrors(prev => ({ ...prev, venue: "" }));
                }
              }}
            />
            {errors.venue && <p className="text-red-500 text-sm">{errors.venue}</p>}
          </div>

          {/* 🔹 Date of Event */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Event *</label>
            <Input
              className={`block ${errors.dateOfEvent ? "border-red-500" : ""}`}
              type="date"
              value={
                formData.dateOfEvent
                  ? (() => {
                      try {
                        const [day, month, year] = formData.dateOfEvent.split("/");
                        if (day && month && year) {
                          return `${year}-${month}-${day}`;
                        }
                        return formData.dateOfEvent;
                      } catch {
                        return "";
                      }
                    })()
                  : ""
              }
              onChange={(e) => {
                const [year, month, day] = e.target.value.split("-");
                const formatted = `${day}/${month}/${year}`;
                setFormData((prev) => ({ ...prev, dateOfEvent: formatted }));
                if (errors.dateOfEvent) {
                  setErrors(prev => ({ ...prev, dateOfEvent: "" }));
                }
              }}
            />
            {errors.dateOfEvent && <p className="text-red-500 text-sm">{errors.dateOfEvent}</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddClientModal;