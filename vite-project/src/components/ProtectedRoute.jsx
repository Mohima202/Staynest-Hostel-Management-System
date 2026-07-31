import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isLoggedIn, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="mx-auto my-20 max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        <p className="font-semibold text-slate-700">Checking login...</p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== requiredRole) {
    return (
      <div className="mx-auto my-20 max-w-2xl rounded-3xl bg-white p-8 text-center shadow-xl shadow-slate-200/70">
        <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4 text-slate-600">
          {requiredRole === "admin"
            ? "Only administrators can access this page."
            : "This page is for users only."}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Your role: <span className="font-semibold">{user.role}</span>
        </p>
        <button
          onClick={() => {
            window.location.href = requiredRole === "admin" ? "/dashboard" : "/admin";
          }}
          className="mt-6 inline-flex rounded-full bg-indigo-600 px-8 py-3 text-white transition hover:bg-indigo-700"
        >
          Go to {requiredRole === "admin" ? "User" : "Admin"} Dashboard
        </button>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="ml-3 inline-flex rounded-full border border-indigo-600 px-8 py-3 text-indigo-600 transition hover:bg-indigo-50"
        >
          Go Home
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
