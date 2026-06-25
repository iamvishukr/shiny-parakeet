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

export default async function sendUpdateNotification(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, body, employeeId, projectId } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: "Missing required fields (title, body)" });
    }

    /* ---------------------------------------------------
       1️⃣ Fetch admins + managers
    --------------------------------------------------- */
    const usersSnapshot = await db
      .collection("users")
      .where("accessLevel", "in", ["admin", "manager", "Admin", "Manager"])
      .get();

    const targetUserIds = new Set<string>();

    usersSnapshot.forEach((doc) => {
      targetUserIds.add(doc.id);
    });

    // Also include the specific employee if provided
    if (employeeId) {
      targetUserIds.add(employeeId);
    }

    /* ---------------------------------------------------
       2️⃣ Fetch FCM tokens for all targets
    --------------------------------------------------- */
    const tokens: string[] = [];

    await Promise.all(
      Array.from(targetUserIds).map(async (uid) => {
        const tokenDoc = await db.collection("fcmTokens").doc(uid).get();
        if (tokenDoc.exists) {
          const token = tokenDoc.data()?.token;
          if (token) tokens.push(token);
        }
      })
    );

    console.log(tokens)

    /* ---------------------------------------------------
       3️⃣ Store notification (single entry)
    --------------------------------------------------- */
    await Promise.all(
      Array.from(targetUserIds).map((uid) =>
        db.collection("notifications").add({
          employeeId: uid,
          title,
          body,
          read: false,
          projectId: projectId || null,
          createdAt: new Date(),
        })
      )
    );

    /* ---------------------------------------------------
       4️⃣ Send push notifications
    --------------------------------------------------- */
    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          projectId: projectId || "",
          type: "update",
        },
      });
    }

    return res.json({
      success: true,
      sentTo: tokens.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message });
    }
  }
}
