"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ViewAttendance from "./ViewAttendance";
import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { ClientOnly } from "@/components/ClientOnly";
import { AuthUser } from "./types";

export default function AttendancePage() {
 const { user } = useAuth() as { user: AuthUser | null };

  const router = useRouter();

  // Check if user has permission to add attendance
  const canAddAttendance = () => {
    if (!user) return false;
    
    // Check if user has attendance or employee permissions
    const hasAttendancePermission = user.permissions?.includes('attendance') || 
                                  user.permissions?.includes('attendence');
    const hasEmployeePermission = user.permissions?.includes('employee');
    
    return hasAttendancePermission || hasEmployeePermission;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground">
            Manage employee attendance records and track daily attendance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canAddAttendance() && (
            <Button
              onClick={() => router.push("/attendance/add")}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Attendance</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        <ClientOnly>
          <ViewAttendance />
        </ClientOnly>
      </div>


    </div>
  );
}
