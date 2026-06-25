"use client";
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Employee } from "../employee/types";
import { useAuth } from "@/context/AuthProvider";
import { firestore } from "@/lib/firebase";

export default function EmployeeProfilePage() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [employee, setEmployee] = useState<Employee | null>(null);

  // Fetch employee profile
  useEffect(() => {
    if (!uid) return;

    const fetchEmployee = async () => {
      try {
        const ref = doc(firestore, "users", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setEmployee(snap.data() as Employee);
        }
      } catch (err) {
        console.error("Error loading employee profile:", err);
      }
    };

    fetchEmployee();
  }, [uid]);

  // Fetch salary history

  if (!employee)
    return (
      <div className="w-full flex justify-center py-20">
        <p>No employee profile found.</p>
      </div>
    );

  const initials = employee.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Section */}
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-2">
          <AvatarImage />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>

        <div>
          <h1 className="text-3xl font-semibold">{employee.name}</h1>
          <p className="text-gray-500">{employee.email}</p>
          <p className="text-sm text-gray-600">Employee ID: {employee.empId}</p>
        </div>
      </div>

      {/* Profile Info */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-6 pb-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Detail label="Phone" value={employee.phone} />
          <Detail label="Date of Birth" value={employee.dob ?? "-"} />
          <Detail label="Gender" value={employee.gender} />
          <Detail label="Aadhar" value={employee.aadhaar} />
          <Detail label="Employment Type" value={employee.employmentType} />
          <Detail label="Profile Status" value={employee.profileStatus} />
          <Detail label="Blood Group" value={employee.bloodGroup ?? "-"} />
          <Detail
            label="Created At"
            value={employee.createdAt ? new Date(employee.createdAt).toLocaleDateString() : "-"}
          />
        </CardContent>
        <p className="px-6 grid grid-cols-1">Address : {employee.address}</p>
      </Card>

      {/* Salary History */}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <span className="font-medium">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}
