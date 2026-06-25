import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Studio Suite",
  description: "© 2025 || Made with 🤍 by Vishal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}

          {/* Global Footer */}
          <footer className="w-full text-center py-4 text-sm text-gray-500 border-t mt-10">
            © {new Date().getFullYear()} Studio ERP — Made with 🤍 by Shrote Technology
          </footer>

          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
