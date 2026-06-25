import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { uId, password, ...rest } = req.body;

    if (!uId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update password in Firebase Auth if provided and valid
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return res.status(400).json({
          message: "Password must be at least 6 characters"
        });
      }

      try {
        await adminAuth.updateUser(uId, { password: password.trim() });

        // Also store password in Firestore for backup/display
        await adminFirestore.collection("users").doc(uId).update({
          password: password.trim(),
          passwordUpdatedAt: new Date().toISOString()
        });
      } catch (authError) {
        console.error("Auth update error:", authError);
        return res.status(500).json({
          message: `Failed to update password: ${(authError as Error).message}`
        });
      }
    }

    // Update other employee data in Firestore (excluding password field)
    // Remove password from rest data to avoid overwriting
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...updateData } = rest;

    if (Object.keys(updateData).length > 0) {
      try {
        // Detect salary change and maintain history
        if (updateData.salary !== undefined) {
          const userDoc = await adminFirestore.collection("users").doc(uId).get();
          const existingData = userDoc.exists ? userDoc.data() : null;

          if (existingData && existingData.salary !== undefined && existingData.salary !== updateData.salary) {
            const existingHistory: { salary: string; effectiveFrom: string }[] =
              Array.isArray(existingData.salaryAmountHistory) ? existingData.salaryAmountHistory : [];

            // If history is empty, seed with the old salary using createdAt or a fallback date
            if (existingHistory.length === 0) {
              const oldEffectiveFrom = existingData.createdAt
                ? existingData.createdAt.substring(0, 10)
                : "2026-01-01";
              existingHistory.push({
                salary: existingData.salary,
                effectiveFrom: oldEffectiveFrom,
              });
            }

            // Push the new salary with the effective date
            existingHistory.push({
              salary: updateData.salary,
              effectiveFrom: updateData.salaryEffectiveDate || new Date().toISOString().substring(0, 10),
            });

            updateData.salaryAmountHistory = existingHistory;
          }
        }

        // Remove temporary fields not meant for direct storage
        delete updateData.salaryEffectiveDate;

        await adminFirestore.collection("users").doc(uId).update(updateData);
      } catch (firestoreError) {
        console.error("Firestore update error:", firestoreError);
        return res.status(500).json({
          message: `Failed to update employee data: ${(firestoreError as Error).message}`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully"
    });
  } catch (err) {
    console.error("Update employee error:", err);
    if (err instanceof Error) {
      return res.status(500).json({ message: err.message });
    }
    return res.status(500).json({ message: "Failed to update employee" });
  }
}