// ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Adjust import path

interface Props {
  children: JSX.Element;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<Props> = ({ children, requireAdmin = false }) => {
  const { user, isAuthInitialized } = useAuth(); // Only use isAuthInitialized for initial loading check

  // While initial authentication check is in progress, show loader — do NOT redirect or render children
  if (!isAuthInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-primary-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
