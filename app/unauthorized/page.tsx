import { AlertCircle } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="mb-4 p-4 rounded-full bg-red-100">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600">
          You do not have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
} 