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
import type React from "react";
import { useState, useEffect, useRef } from "react";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Check } from "lucide-react";
import { Task } from "./other/columns";

interface AddTaskModalProps {
  open: boolean;
  onOpenChange?: () => void;
  employees?: Record<string, string>;
  task?: Task;
}

function AddTaskModal({ open, onOpenChange, employees, task }: AddTaskModalProps) {
  const [assignedName, setAssignedName] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assignedDate, setAssignedDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(task);

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setAssignedName("");
      setAssignedTo([]);
      setAssignedDate("");
      setDeliveryDate("");
      setDescription("");
      setErrors({});
      setSearchTerm("");
      setDropdownOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEdit && task) {
        setAssignedName(task.name || "");
        // Use the employeeIds array from grouped task
        setAssignedTo(task.employeeIds || []);
        setDescription(task.description || "");

        const assignedDateValue = task.assignedDate;
        if (assignedDateValue) {
          setAssignedDate(
            assignedDateValue instanceof Date
              ? assignedDateValue.toISOString().split("T")[0]
              : assignedDateValue
          );
        } else {
          setAssignedDate("");
        }

        const deliveryDateValue = task.deliveryDate;
        if (deliveryDateValue) {
          setDeliveryDate(
            deliveryDateValue instanceof Date
              ? deliveryDateValue.toISOString().split("T")[0]
              : deliveryDateValue
          );
        } else {
          setDeliveryDate("");
        }
      } else {
        setAssignedName("");
        setAssignedTo([]);
        setAssignedDate("");
        setDeliveryDate("");
        setDescription("");
      }
      setErrors({});
    }
  }, [task, open, isEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEmployeeSelect = (employeeId: string) => {
    setAssignedTo((prev) => {
      if (prev.includes(employeeId)) {
        return prev.filter((id) => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
    clearError("assignedTo");
  };

  const removeEmployee = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignedTo((prev) => prev.filter((id) => id !== employeeId));
  };

  const handleSubmit = async () => {
    if (!assignedName.trim()) {
      setErrors({ assignedName: "Task name is required" });
      return;
    }

    if (assignedName.trim().length < 5) {
      setErrors({ assignedName: "Task name must be at least 5 characters" });
      return;
    }

    setErrors({});

    try {
      setSaving(true);
      if (isEdit && task) {
        if (assignedTo.length === 0) {
          // Delete task from all previously assigned employees
          const deletePromises = task.employeeIds.map(async (employeeId) => {
            const taskDocRef = doc(firestore, "task", employeeId);
            const snap = await getDoc(taskDocRef);

            if (!snap.exists()) return;

            const tasks = snap.data()?.tasks || [];
            const updatedTasks = tasks.filter((t: { taskId: string }) => t.taskId !== task.id);

            await updateDoc(taskDocRef, { tasks: updatedTasks });
          });

          await Promise.all(deletePromises);
          toast.success("Task deleted successfully (all employees removed)");
          onOpenChange?.();
          return;
        }

        // Edit mode - update the task for all selected employees
        if (assignedTo.length === 0) {
          toast.error("Please select at least one employee");
          return;
        }

        // Get all previously assigned employees
        const previousEmployees = task.employeeIds;

        // Find employees to remove (were assigned before, but not now)
        const employeesToRemove = previousEmployees.filter((empId) => !assignedTo.includes(empId));

        // Find employees to add (newly assigned)
        const employeesToAdd = assignedTo.filter((empId) => !previousEmployees.includes(empId));

        // Remove task from employees who are no longer assigned
        const removePromises = employeesToRemove.map(async (employeeId) => {
          const taskDocRef = doc(firestore, "task", employeeId);
          const snap = await getDoc(taskDocRef);

          if (!snap.exists()) return;

          const tasks = snap.data()?.tasks || [];
          const updatedTasks = tasks.filter((t: { taskId: string }) => t.taskId !== task.id);

          await updateDoc(taskDocRef, { tasks: updatedTasks });
        });

        // Update task for employees who remain assigned
        const updatePromises = assignedTo
          .filter((empId) => previousEmployees.includes(empId))
          .map(async (employeeId) => {
            const taskDocRef = doc(firestore, "task", employeeId);
            const snap = await getDoc(taskDocRef);

            if (!snap.exists()) return;

            const tasks = snap.data()?.tasks || [];
            const taskIndex = tasks.findIndex((t: { taskId: string }) => t.taskId === task.id);

            if (taskIndex !== -1) {
              tasks[taskIndex] = {
                ...tasks[taskIndex],
                name: assignedName,
                assignedDate: assignedDate || null,
                deliveryDate: deliveryDate || null,
                description: description || "",
              };
              await updateDoc(taskDocRef, { tasks });
            }
          });

        // Add task to newly assigned employees
        const addPromises = employeesToAdd.map(async (employeeId) => {
          const taskDocRef = doc(firestore, "task", employeeId);
          const snap = await getDoc(taskDocRef);

          const newTask = {
            taskId: task.id,
            name: assignedName,
            employeeId: employeeId,
            assignedDate: assignedDate || null,
            deliveryDate: deliveryDate || null,
            description: description || "",
            createdAt: task.createdAt?.toISOString() || new Date().toISOString(),
            status: task.status || "Pending",
            type: "Other",
          };

          if (snap.exists()) {
            await updateDoc(taskDocRef, { tasks: [...(snap.data()?.tasks || []), newTask] });
          } else {
            await setDoc(taskDocRef, { tasks: [newTask] });
          }
        });

        await Promise.all([...removePromises, ...updatePromises, ...addPromises]);
        toast.success("Task updated successfully for all selected employees");
      } else {
        // Add mode - create new task for all selected employees
        if (assignedTo.length === 0) {
          toast.error("Please select at least one employee");
          return;
        }

        const taskId = uuidv4();
        const updatePromises = assignedTo.map(async (employeeId) => {
          const taskDocRef = doc(firestore, "task", employeeId);
          const snap = await getDoc(taskDocRef);

          const newTask = {
            taskId: taskId,
            name: assignedName,
            employeeId: employeeId,
            assignedDate: assignedDate || null,
            deliveryDate: deliveryDate || null,
            description: description || "",
            createdAt: new Date().toISOString(),
            status: "Pending",
            type: "Other",
          };

          await fetch("/api/sendNotifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: employeeId,
              title: "New Task Assigned",
              body: `${employees?.name || "You"} have been assigned to: ${assignedName}`,
            }),
          });

          if (snap.exists()) {
            await updateDoc(taskDocRef, { tasks: [...(snap.data()?.tasks || []), newTask] });
          } else {
            await setDoc(taskDocRef, { tasks: [newTask] });
          }
        });

        await Promise.all(updatePromises);
        toast.success(`Task added successfully for ${assignedTo.length} employee(s)`);
      }
      setSaving(false);
      onOpenChange?.();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const filteredEmployees = employees
    ? Object.entries(employees).filter(([, name]) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task from Deliverable"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Name *</label>
            <Input
              placeholder="Enter task name"
              value={assignedName}
              className={errors.assignedName ? "border-red-500" : ""}
              onChange={(e) => {
                setAssignedName(e.target.value);
                clearError("assignedName");
              }}
            />
            {errors.assignedName && <p className="text-red-500 text-sm">{errors.assignedName}</p>}
            {assignedName.trim() && assignedName.trim().length < 5 && (
              <p className="text-orange-500 text-sm">
                {5 - assignedName.trim().length} characters remaining
              </p>
            )}
          </div>

          <div className="space-y-2" ref={dropdownRef}>
            <label className="text-sm font-medium">Assign To</label>
            <div className="relative">
              <div
                className={`flex items-center justify-between w-full p-2 border rounded-md cursor-pointer ${
                  errors.assignedTo ? "border-red-500" : ""
                }`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="flex flex-wrap gap-1 flex-1">
                  {assignedTo.length > 0 ? (
                    assignedTo.map((employeeId) => {
                      const employeeName = employees?.[employeeId] || employeeId;
                      return (
                        <Badge key={employeeId} variant="secondary" className="mr-1 mb-1">
                          {employeeName}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer"
                            onClick={(e) => removeEmployee(employeeId, e)}
                          />
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-muted-foreground">Select employees...</span>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </div>

              {dropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-8"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="py-1">
                    {filteredEmployees.length > 0 ? (
                      filteredEmployees.map(([employeeId, employeeName]) => (
                        <div
                          key={employeeId}
                          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                            assignedTo.includes(employeeId) ? "bg-blue-50" : ""
                          }`}
                          onClick={() => handleEmployeeSelect(employeeId)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              assignedTo.includes(employeeId)
                                ? "opacity-100 text-blue-600"
                                : "opacity-0"
                            }`}
                          />
                          <span className="flex-1">{employeeName}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                        No employees found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.assignedTo && <p className="text-red-500 text-sm">{errors.assignedTo}</p>}
            {isEdit && assignedTo.length === 0 && (
              <p className="text-amber-600 text-sm">
                Warning: Removing all employees will delete this task
              </p>
            )}
            {assignedTo.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Selected: {assignedTo.length} employee(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description (Optional)</label>
            <Input
              placeholder="Enter description"
              value={description}
              className={errors.description ? "border-red-500" : ""}
              onChange={(e) => {
                setDescription(e.target.value);
                clearError("description");
              }}
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
            {description.trim() && description.trim().length < 5 && (
              <p className="text-orange-500 text-sm">
                {5 - description.trim().length} characters remaining
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Date (Optional)</label>
              <Input
                type="date"
                value={assignedDate}
                className={errors.assignedDate ? "border-red-500" : ""}
                onChange={(e) => {
                  setAssignedDate(e.target.value);
                  clearError("assignedDate");
                  if (errors.deliveryDate && e.target.value && deliveryDate) {
                    if (new Date(deliveryDate) >= new Date(e.target.value)) {
                      clearError("deliveryDate");
                    }
                  }
                }}
              />
              {errors.assignedDate && <p className="text-red-500 text-sm">{errors.assignedDate}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Date (Optional)</label>
              <Input
                type="date"
                value={deliveryDate}
                className={errors.deliveryDate ? "border-red-500" : ""}
                onChange={(e) => {
                  setDeliveryDate(e.target.value);
                  clearError("deliveryDate");
                }}
              />
              {errors.deliveryDate && <p className="text-red-500 text-sm">{errors.deliveryDate}</p>}
            </div>
          </div>

          <p className="text-sm text-muted-foreground pt-2">* Required field</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving" : isEdit ? "Update Task" : "Save Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddTaskModal;
