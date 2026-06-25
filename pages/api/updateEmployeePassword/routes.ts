import type { NextApiRequest, NextApiResponse } from "next";
import { adminFirestore } from "@/lib/firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "PUT") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { uId, password } = req.body;

    if (!uId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (password === "") {
      return res.status(200).json({
        success: true,
        message: "No password change requested",
      });
    }

    if (password && password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    if (password) {
      await adminFirestore.collection("users").doc(uId).update({
        password,
        passwordUpdatedAt: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: password ? "Password updated successfully" : "No password changes",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Failed to update password" });
  }
}
