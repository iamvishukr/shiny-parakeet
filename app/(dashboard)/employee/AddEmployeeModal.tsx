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
import { Employee } from "./types";
import { doc, collection, onSnapshot, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { firestore } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PasswordInput from "@/components/ui/passwordInput";
import { Label } from "@/components/ui/label";

interface Props {
  employee?: Employee | null;
  open: boolean;
  onOpenChange?: () => void;
}

function AddEmployeeModal({ employee, open, onOpenChange }: Props) {
  const [formData, setFormData] = useState({
    uId: "",
    empId: "",
    name: "",
    username: "",
    password: "",
    email: "",
    phone: "",
    aadhaar: "",
    gender: "",
    dob: "",
    bloodGroup: "",
    address: "",
    salary: "",
    salaryEffectiveDate: new Date().toISOString().substring(0, 10),
    paidSalary: 0,
    profileStatus: "Active",
    userType: "employee",
    createdAt: "",
    assignedCompany: {},
    salaryHistory: {},
    accessLevelMap: {},
    salaryStatus: "Unpaid",
    accessLevel: "",
    employmentType: "",
  });

  const [existingEmployees, setExistingEmployees] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "users"), (snapshot) => {
      const names = snapshot.docs.map((doc) => doc.data().name?.toLowerCase().trim());
      setExistingEmployees(names);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (employee && open) {
        setIsLoading(true);
        try {
          const employeeDoc = await getDoc(doc(firestore, "users", employee.uId));
          if (employeeDoc.exists()) {
            const employeeData = employeeDoc.data();
            setFormData({
              uId: employeeData.uId || "",
              empId: employeeData.empId || "",
              name: employeeData.name || "",
              username: employeeData.username || "",
              password: "", // Don't fetch password for security
              email: employeeData.email || "",
              phone: employeeData.phone || "",
              aadhaar: employeeData.aadhaar || "",
              gender: employeeData.gender || "",
              dob: employeeData.dob || "",
              bloodGroup: employeeData.bloodGroup || "",
              address: employeeData.address || "",
              salary: employeeData.salary || "",
              paidSalary: employeeData.paidSalary || 0,
              profileStatus: employeeData.profileStatus || "Active",
              userType: employeeData.userType || "employee",
              createdAt: employeeData.createdAt || "",
              assignedCompany: employeeData.assignedCompany || {},
              salaryHistory: employeeData.salaryHistory || {},
              accessLevelMap: employeeData.accessLevelMap || {},
              salaryStatus: employeeData.salaryStatus || "Unpaid",
              accessLevel: employeeData.accessLevel || "",
              employmentType: employeeData.employmentType || "",
              salaryEffectiveDate: new Date().toISOString().substring(0, 10),
            });
          } else {
            toast.error("Employee data not found");
          }
        } catch (error) {
          toast.error("Failed to fetch employee data");
          console.error("Error fetching employee:", error);
        } finally {
          setIsLoading(false);
        }
      } else if (!employee && open) {
        // Reset form for new employee
        setFormData({
          uId: "",
          empId: "",
          name: "",
          username: "",
          password: "",
          email: "",
          phone: "",
          aadhaar: "",
          gender: "",
          dob: "",
          bloodGroup: "",
          address: "",
          salary: "",
          salaryEffectiveDate: new Date().toISOString().substring(0, 10),
          paidSalary: 0,
          profileStatus: "Active",
          userType: "employee",
          createdAt: new Date().toISOString(),
          assignedCompany: {},
          salaryHistory: {},
          accessLevelMap: {},
          salaryStatus: "Unpaid",
          accessLevel: "",
          employmentType: "",
        });
      }
      // Clear errors when modal opens/closes or employee changes
      setErrors({});
    };

    fetchEmployeeData();
  }, [employee, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full Name is required";
    }
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    // Password validation for new employees
    if (!employee && !formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!employee && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    // Password validation for existing employees (only if they try to change it)
    if (employee && formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone must be 10 digits";
    }
    if (!formData.aadhaar.trim()) {
      newErrors.aadhaar = "Aadhaar number is required";
    } else if (!/^[0-9]{12}$/.test(formData.aadhaar)) {
      newErrors.aadhaar = "Aadhaar must be 12 digits";
    }
    if (!formData.gender.trim()) {
      newErrors.gender = "Gender is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }
    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required";
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      newErrors.salary = "Salary must be a valid number";
    }
    if (!formData.employmentType.trim()) {
      newErrors.employmentType = "Employment Type is required";
    }
    if (formData.employmentType !== "Freelancer" && !formData.accessLevel.trim()) {
      newErrors.accessLevel = "Access Level is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate all fields
    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    // Duplicate name check
    const normalizedName = formData.name.toLowerCase().trim();
    if (
      existingEmployees.includes(normalizedName) &&
      normalizedName !== employee?.name.toLowerCase().trim()
    ) {
      toast.warning("Employee already present");
      return;
    }

    try {
      setIsLoading(true);

      let userId = employee?.uId;
      let newEmpId = formData.empId;

      // Build submission data (but do NOT include password here)
      const submissionData: Employee = {
        ...formData,
        empId: newEmpId,
        createdAt: formData.createdAt || new Date().toISOString(),
      };

      // Remove password from Firestore payload
      delete submissionData.password;

      /* ----------------------------------------------------
       1️⃣ CREATE NEW EMPLOYEE
    ---------------------------------------------------- */
    
      if (!employee) {
        
        
        const response = await fetch("/api/createEmployee", {
          
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            additionalData: submissionData,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to create employee");

        // Assign generated IDs
        userId = data.uid;
        newEmpId = data.empId;
        submissionData.uId = data.uid;
        submissionData.empId = newEmpId;

        toast.success("Employee created");
        onOpenChange?.();
        return;
      }

      /* ----------------------------------------------------
       2️⃣ UPDATE EXISTING EMPLOYEE (INCLUDING PASSWORD)
    ---------------------------------------------------- */
      const response = await fetch("/api/updateEmployee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...submissionData,
          uId: userId,
          password: formData.password || "", // Only updates password if provided
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update employee");

      toast.success("Employee updated");
      onOpenChange?.();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message || "Failed to save employee");
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
    clearError("password");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {employee ? "Edit Employee" : "Add Employee"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="space-y-6 py-4">
              {/* Personal Info */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Full Name *"
                      value={formData.name}
                      className={errors.name ? "border-red-500" : ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, name: e.target.value }));
                        clearError("name");
                      }}
                    />
                    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Aadhaar Number *"
                      value={formData.aadhaar}
                      className={errors.aadhaar ? "border-red-500" : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 12);
                        setFormData((p) => ({ ...p, aadhaar: value }));
                        clearError("aadhaar");
                      }}
                      maxLength={12}
                    />
                    {errors.aadhaar && <p className="text-red-500 text-sm">{errors.aadhaar}</p>}
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={formData.email}
                      className={errors.email ? "border-red-500" : ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, email: e.target.value }));
                        clearError("email");
                      }}
                    />
                    {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Input
                      placeholder="Phone *"
                      value={formData.phone}
                      className={errors.phone ? "border-red-500" : ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData((p) => ({ ...p, phone: value }));
                        clearError("phone");
                      }}
                      maxLength={10}
                    />
                    {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={formData.gender}
                      onValueChange={(val) => {
                        setFormData((p) => ({ ...p, gender: val }));
                        clearError("gender");
                      }}
                    >
                      <SelectTrigger className={errors.gender ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Select gender *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(val) => {
                        setFormData((p) => ({ ...p, bloodGroup: val }));
                        clearError("bloodGroup");
                      }}
                    >
                      <SelectTrigger className={errors.bloodGroup ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Select Blood Group *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.bloodGroup && <p className="text-red-500 text-sm">{errors.bloodGroup}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input
                      placeholder="Date of Birth *"
                      type="date"
                      value={formData.dob}
                      className={errors.dob ? "border-red-500" : ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, dob: e.target.value }));
                        clearError("dob");
                      }}
                    />
                    {errors.dob && <p className="text-red-500 text-sm">{errors.dob}</p>}
                  </div>
                </div>
              </div>

              {/* Assign Credentials Section */}
              <div className="border rounded-lg p-4 bg-gray-50/50">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Assign Credentials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Assign Username *"
                      value={formData.username}
                      className={errors.username ? "border-red-500" : ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, username: e.target.value }));
                        clearError("username");
                      }}
                      disabled={!!employee}
                    />
                    {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
                  </div>

                  <div className="space-y-2">
                    <PasswordInput
                      value={formData.password}
                      onChange={handlePasswordChange}
                      placeholder={
                        employee
                          ? "Change Password (leave blank to keep current)"
                          : "Assign Password *"
                      }
                      error={errors.password}
                    />
                    {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                    {employee && (
                      <p className="text-xs text-muted-foreground">
                        Enter new password (min 6 characters) or leave blank to keep current
                        password
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Contact Information
                </h3>
                <Textarea
                  placeholder="Address *"
                  value={formData.address}
                  className={errors.address ? "border-red-500" : ""}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, address: e.target.value }));
                    clearError("address");
                  }}
                />
                {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
              </div>

              {/* Employment Info */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Employment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Salary *"
                      type="number"
                      value={formData.salary}
                      className={errors.salary ? "border-red-500" : ""}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, salary: e.target.value }));
                        clearError("salary");
                      }}
                    />
                    {errors.salary && <p className="text-red-500 text-sm">{errors.salary}</p>}
                  </div>

                  {employee && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground ml-1">Salary Effective Date</Label>
                      <Input
                        type="date"
                        value={formData.salaryEffectiveDate}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, salaryEffectiveDate: e.target.value }));
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Select
                      value={formData.employmentType}
                      onValueChange={(val) => {
                        setFormData((p) => ({ ...p, employmentType: val }));
                        clearError("employmentType");
                        clearError("accessLevel");
                      }}
                    >
                      <SelectTrigger className={errors.employmentType ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Employment Type *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freelancer">Freelancer</SelectItem>
                        <SelectItem value="Fulltime">Fulltime</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.employmentType && (
                      <p className="text-red-500 text-sm">{errors.employmentType}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={formData.accessLevel}
                      onValueChange={(val) => {
                        setFormData((p) => ({ ...p, accessLevel: val }));
                        clearError("accessLevel");
                      }}
                    >
                      <SelectTrigger className={errors.accessLevel ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Access Level *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Staff">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.accessLevel && (
                      <p className="text-red-500 text-sm">{errors.accessLevel}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={formData.profileStatus}
                      onValueChange={(val) => {
                        setFormData((p) => ({ ...p, profileStatus: val }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status *" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="sticky bottom-0 bg-background border-t mt-4 pt-3 flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AddEmployeeModal;
