"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase"; // ensure you have firestore exported
import { getPermissionsByRole } from "@/lib/utils";

type AuthContextType = {
  user: FirebaseUser | null;
  role: string | null;
  permissions: string[];
  isAuthLoaded: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  permissions: [],
  isAuthLoaded: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user role from Firestore
        const userDocRef = doc(firestore, "users", firebaseUser.uid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const data = snap.data();
          const userRole = data?.accessLevel.toLowerCase() || "employee";
          setRole(userRole);
          setUser({ ...firebaseUser, displayName: data.name } as FirebaseUser);

          // Assign permissions based on role
          const rolePermissions = getPermissionsByRole(userRole);
          setPermissions(rolePermissions);

          // Save to localStorage (optional, for faster reload)
          if (typeof window !== "undefined") {
            localStorage.setItem("role", userRole);
            localStorage.setItem("permissions", rolePermissions.join(","));
          }
        }
      } else {
        // clear everything if logged out
        setRole(null);
        setPermissions([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem("role");
          localStorage.removeItem("permissions");
        }
      }

      setIsAuthLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, permissions, isAuthLoaded }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
