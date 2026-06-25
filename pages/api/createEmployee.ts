import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { email, password, name, additionalData = {} } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Email, phone, and name are required" });
    }

    // 1 Create user in Firebase Auth (server-side)
    const userRecord = await adminAuth.createUser({
      email,
      password: password, // default password
      displayName: name,
    });

    // 2 Generate empId (EMP-001, EMP-002, etc)
    const counterRef = adminFirestore.collection("metadata").doc("empCounter");
    const counterSnap = await counterRef.get();

    let latest = 0;
    if (counterSnap.exists) {
      latest = counterSnap.data()?.latest ?? 0;
    }

    const newNumber = latest + 1;
    const empId = `S7-EMP-${String(newNumber).padStart(3, "0")}`;

    // Save updated counter
    await counterRef.set({ latest: newNumber }, { merge: true });

    // 3 Save user info in Firestore
    await adminFirestore
      .collection("users")
      .doc(userRecord.uid)
      .set({
        ...additionalData,
        uId: userRecord.uid,
        empId,
        name,
        createdAt: new Date().toISOString(),
        profileStatus: "Active",
        userType: "employee",
      });

    return res
      .status(200)
      .json({ message: "Employee created successfully", uid: userRecord.uid, empId });
  } catch (err) {
    console.error(err);
    if (err instanceof Error)
      return res.status(500).json({ message: err.message || "Failed to create employee" });
  }
}
