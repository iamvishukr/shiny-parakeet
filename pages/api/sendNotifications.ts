import type { NextApiRequest, NextApiResponse } from "next";
import admin from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin init
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { employeeId, title, body, shootId, projectId } = req.body;

    if (!employeeId || !title || !body) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const tokenDoc = await db.collection("fcmTokens").doc(employeeId).get();
    const fcmToken = tokenDoc.exists ? tokenDoc.data()?.token : null;

    const notificationRef = await db.collection("notifications").add({
      employeeId,
      title,
      body,
      shootId: shootId || null,
      projectId: projectId || null,
      read: false,
      createdAt: new Date(),
    });

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: {
          notificationId: notificationRef.id,
          shootId: shootId || "",
          projectId: projectId || "",
        },
      });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof Error) return res.status(500).json({ error: error.message });
  }
}
