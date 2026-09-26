import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, dbUser, switchRole, loading } = useAuth();
  const [elevating, setElevating] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <span className="w-8 h-8 rounded-lg bg-[#1B5E4A] text-white font-black text-lg inline-flex items-center justify-center mb-3 animate-spin">
            +
          </span>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Verifying Session...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const userRole = dbUser?.role || "patient";

  const handleQuickElevate = async targetRole => {
    setElevating(true);
    try {
      await switchRole(targetRole);
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setElevating(false);
    }
  };

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <span className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 font-black text-xl inline-flex items-center justify-center mb-4">
            !
          </span>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            Staff Authorization Required
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
            Your account is currently set to{" "}
            <b className="uppercase text-slate-900">{userRole}</b>. This portal
            is restricted to verified Hospital Administrators and Medical
            Doctors.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => handleQuickElevate("admin")}
              disabled={elevating}
              className="px-5 py-2.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {elevating
                ? "Switching Role..."
                : "Switch My Role to Admin (Demo)"}
            </button>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
