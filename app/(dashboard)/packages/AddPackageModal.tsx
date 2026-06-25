"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/shared/MultiSelect";
import { Package, DeliverableWithQuantity } from "./types";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Shoot, shootInitialState } from "../shoots/types";
import { Deliverable } from "../deliverables/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event } from "../events/types";

interface Props {
  initialData?: Package | null;
  open: boolean;
  onClose: () => void;
  onSave: (pkg: Package) => Promise<void>;
}

function AddPackageModal({ initialData, open, onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    eventId: "",
    shoots: [] as string[],
    deliverables: [] as DeliverableWithQuantity[],
  });

  const [events, setEvents] = useState<Event[]>([]);
  const [shootOptions, setShootOptions] = useState<
    Array<{ value: string; label: string; data?: Shoot }>
  >([]);
  const [deliverableOptions, setDeliverableOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "events"), (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        eventId: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "shoots"), (snapshot) => {
      const shoots = snapshot.docs.map((doc) => {
        const data = doc.data() as Shoot;
        return {
          value: doc.id,
          label: data.name,
          data: { ...data, shootId: doc.id },
        };
      });
      setShootOptions(shoots);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "deliverables"), (snapshot) => {
      const deliverables = snapshot.docs.map((doc) => {
        const data = doc.data() as Deliverable;
        return {
          value: doc.id,
          label: data.name,
        };
      });
      setDeliverableOptions(deliverables);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        price: initialData.price.toString(),
        eventId: initialData.eventId || "",
        shoots: initialData.shoots || [],
        deliverables: (initialData.deliverables || []).map((d) => ({
          deliverableId: d.deliverableId,
          quantity: d.quantity?.toString() || "1",
          description: d.description || "",
        })),
      });
    } else {
      setFormData({ name: "", price: "", eventId: "", shoots: [], deliverables: [] });
    }
    // Clear errors when modal opens/closes or initialData changes
    setErrors({});
  }, [initialData, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.eventId.trim()) {
      newErrors.eventId = "Event is required";
    }
    if (!formData.name.trim()) {
      newErrors.name = "Package name is required";
    }
    if (!formData.price.trim()) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = "Price must be a valid number";
    }
    if (formData.shoots.length === 0) {
      newErrors.shoots = "At least one shoot is required";
    }
    if (formData.deliverables.length === 0) {
      newErrors.deliverables = "At least one deliverable is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate all fields
    if (!validateForm()) {
      return;
    }

    await onSave({
      ...initialData,
      name: formData.name,
      price: parseFloat(formData.price) || 0,
      eventId: formData.eventId,
      shoots: formData.shoots,
      deliverables: formData.deliverables,
      createdAt: initialData?.createdAt || new Date(),
    } as Package);
  };

  const handleDeliverableChange = (selectedIds: string[]) => {
    const existingDeliverables = formData.deliverables.filter((d) =>
      selectedIds.includes(d.deliverableId)
    );

    const newDeliverables = selectedIds
      .filter((id) => !formData.deliverables.find((d) => d.deliverableId === id))
      .map((id) => ({ deliverableId: id, quantity: "1", description: "" }));

    setFormData((prev) => ({
      ...prev,
      deliverables: [...existingDeliverables, ...newDeliverables],
    }));

    // Clear deliverable error when deliverables are selected
    if (selectedIds.length > 0 && errors.deliverables) {
      setErrors((prev) => ({ ...prev, deliverables: "" }));
    }
  };

  const handleQuantityChange = (deliverableId: string, quantity: string) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) =>
        d.deliverableId === deliverableId ? { ...d, quantity } : d
      ),
    }));
  };

  const handleDescriptionChange = (deliverableId: string, description: string) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) =>
        d.deliverableId === deliverableId ? { ...d, description } : d
      ),
    }));
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Helper function to safely render shoot values
  const renderShootValue = (value: unknown): string => {
    if (value === null || value === undefined) return "0";
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px] md:max-w-[1000px] lg:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Package" : "Add Package"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event *</label>
              <Select
                value={formData.eventId}
                onValueChange={(value: string) => {
                  setFormData((prev) => ({ ...prev, eventId: value }));
                  clearError("eventId");
                }}
              >
                <SelectTrigger className={`w-full ${errors.eventId ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select an event *" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.eventId} value={event.eventId}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.eventId && <p className="text-red-500 text-sm">{errors.eventId}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Package Name *</label>
              <Input
                placeholder="Package Name *"
                value={formData.name}
                className={errors.name ? "border-red-500" : ""}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  clearError("name");
                }}
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Price *</label>
            <Input
              type="number"
              placeholder="Price *"
              value={formData.price}
              className={errors.price ? "border-red-500" : ""}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, price: e.target.value }));
                clearError("price");
              }}
            />
            {errors.price && <p className="text-red-500 text-sm">{errors.price}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Shoots *</label>
            <div className={errors.shoots ? "border border-red-500 rounded-md p-2" : ""}>
              <MultiSelect
                options={shootOptions}
                selected={formData.shoots}
                onChange={(shoots) => {
                  setFormData((prev) => ({ ...prev, shoots }));
                  // Clear shoots error when shoots are selected
                  if (shoots.length > 0 && errors.shoots) {
                    setErrors((prev) => ({ ...prev, shoots: "" }));
                  }
                }}
                placeholder="Select shoots included in package... *"
                searchPlaceholder="Search available shoots..."
              />
            </div>
            {errors.shoots && <p className="text-red-500 text-sm">{errors.shoots}</p>}
            {formData.shoots.length > 0 && (
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Shoot Name</TableHead>
                      {Object.keys(shootInitialState)
                        .filter((key) => key !== "name")
                        .map((key) => (
                          <TableHead key={key} className="w-[100px] text-center">
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.shoots.map((shootId) => {
                      const shoot = shootOptions.find((opt) => opt.value === shootId)?.data;
                      if (!shoot) return null;
                      return (
                        <TableRow key={shootId}>
                          <TableCell className="font-medium">{shoot.name}</TableCell>
                          {Object.keys(shootInitialState)
                            .filter((key) => key !== "name")
                            .map((key) => (
                              <TableCell key={key} className="text-center">
                                {renderShootValue(shoot[key as keyof Shoot])}
                              </TableCell>
                            ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deliverables *</label>
            <div className={errors.deliverables ? "border border-red-500 rounded-md p-2" : ""}>
              <MultiSelect
                options={deliverableOptions}
                selected={formData.deliverables.map((d) => d.deliverableId)}
                onChange={handleDeliverableChange}
                placeholder="Select deliverables included in package... *"
                searchPlaceholder="Search available deliverables..."
              />
            </div>
            {errors.deliverables && <p className="text-red-500 text-sm">{errors.deliverables}</p>}
            {formData.deliverables.length > 0 && (
              <div className="mt-2 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Deliverable</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                      <TableHead className="w-[100px] text-right">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.deliverables.map((deliverable) => {
                      const option = deliverableOptions.find(
                        (opt) => opt.value === deliverable.deliverableId
                      );
                      return (
                        <TableRow key={deliverable.deliverableId}>
                          <TableCell>{option?.label}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              value={deliverable.quantity}
                              onChange={(e) =>
                                handleQuantityChange(deliverable.deliverableId, e.target.value)
                              }
                              className="w-20 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              value={deliverable.description}
                              onChange={(e) =>
                                handleDescriptionChange(deliverable.deliverableId, e.target.value)
                              }
                              className="ml-auto"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
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

export default AddPackageModal;
