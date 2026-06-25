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
import { Enquiry } from "./types";
import { firestore } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { format } from "date-fns";
import HybridSelect from "@/components/shared/HybridSelect";

interface AddEnquiryModalProps {
  enquiry?: Enquiry | null;
  open: boolean;
  onOpenChange?: () => void;
}

function AddEnquiryModal({ enquiry, open, onOpenChange }: AddEnquiryModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phoneNo: "",
    address: "",
    projectType: "",
    venue: "",
    dateOfEvent: "", // stored as string only
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({
    name: "",
    phoneNo: "",
    address: "",
    projectType: "",
    venue: "",
    dateOfEvent: "",
  });

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";

    if (!formData.phoneNo.trim()) newErrors.phoneNo = "Phone number is required";
    else if (formData.phoneNo.length !== 10) newErrors.phoneNo = "Phone number must be 10 digits";

    if (!formData.address.trim()) newErrors.address = "Address is required";

    if (!formData.projectType.trim()) newErrors.projectType = "Project type is required";

    if (!formData.venue.trim()) newErrors.venue = "Venue is required";

    if (!formData.dateOfEvent.trim()) newErrors.dateOfEvent = "Date of event is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // form valid?
  };

  const [projectTypes, setProjectTypes] = useState<{ name: string }[]>([]);

  // 🔹 Fetch Project Types from Firestore (events collection)
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

  // 🔹 Fill form when editing
  useEffect(() => {
    if (enquiry) {
      setFormData({
        name: enquiry.name,
        phoneNo: enquiry.phoneNo,
        address: enquiry.address,
        projectType: enquiry.projectType || "",
        venue: enquiry.venue || "",
        dateOfEvent:
          enquiry.dateOfEvent && typeof enquiry.dateOfEvent !== "string"
            ? format((enquiry.dateOfEvent as Timestamp).toDate(), "dd/MM/yyyy")
            : enquiry.dateOfEvent || "",
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
  }, [enquiry, open]);

  function generateEnquiryId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `enquiry-${result}`;
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill all required fields");
      return;
    }
    const enquiryId = enquiry?.enquiryId || generateEnquiryId();

    try {
      await setDoc(
        doc(firestore, "enquiry", enquiryId),
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

      toast.success(enquiry ? "Enquiry updated successfully" : "Enquiry added successfully");
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving enquiry:", error);
      toast.error("Failed to save enquiry");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enquiry ? "Edit Enquiry" : "Add Enquiry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 🔹 Name */}
          <div className="space-y-2">
            <Input
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          {/* 🔹 Phone Number */}
          <div className="space-y-2">
            <Input
              placeholder="Phone Number"
              value={formData.phoneNo}
              type="text"
              maxLength={10}
              pattern="\d*"
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                if (value.length <= 10) {
                  setFormData((prev) => ({ ...prev, phoneNo: value }));
                }
              }}
            />
            {errors.phoneNo && <p className="text-red-500 text-xs">{errors.phoneNo}</p>}
          </div>

          {/* 🔹 Address */}
          <div className="space-y-2">
            <Textarea
              placeholder="Address"
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
            />
            {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
          </div>

          {/* 🔹 Project Type Dropdown */}
          <HybridSelect
            label="Project Type"
            options={projectTypes}
            value={formData.projectType}
            onChange={(val) => setFormData((prev) => ({ ...prev, projectType: val }))}
          />
          {errors.projectType && <p className="text-red-500 text-xs">{errors.projectType}</p>}

          {/* 🔹 Venue Field */}
          <div className="space-y-2">
            <Input
              placeholder="Venue"
              value={formData.venue}
              onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
            />
            {errors.venue && <p className="text-red-500 text-xs">{errors.venue}</p>}
          </div>

          {/* 🔹 Date of Event Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Event</label>
            <Input
              className="block"
              type="date"
              value={
                formData.dateOfEvent
                  ? (() => {
                      try {
                        // Try parsing if already DD/MM/YYYY
                        const [day, month, year] = formData.dateOfEvent.split("/");
                        if (day && month && year) {
                          return `${year}-${month}-${day}`;
                        }
                        return formData.dateOfEvent; // fallback if already yyyy-MM-dd
                      } catch {
                        return "";
                      }
                    })()
                  : ""
              }
              onChange={(e) => {
                // Always save as string in DD/MM/YYYY
                const [year, month, day] = e.target.value.split("-");
                const formatted = `${day}/${month}/${year}`;
                setFormData((prev) => ({ ...prev, dateOfEvent: formatted }));
              }}
            />
            {errors.dateOfEvent && <p className="text-red-500 text-xs">{errors.dateOfEvent}</p>}
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

export default AddEnquiryModal;
