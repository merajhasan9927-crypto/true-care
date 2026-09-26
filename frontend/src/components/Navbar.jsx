import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { currentUser, dbUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "AI Diagnosis", path: "/diagnosis" },
    { name: "Emergency ER", path: "/emergency-map" },
    { name: "Appointments", path: "/appointments" },
    { name: "Health Records", path: "/records" },
    { name: "Medical ID", path: "/profile" },
  ];

  if (dbUser?.role === "admin" || dbUser?.role === "doctor") {
    navLinks.push({ name: "Hospital Ops", path: "/admin" });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#F9FBFA]/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#1B5E4A] text-white font-black text-lg flex items-center justify-center">
            +
          </span>
          <span className="text-xl font-black text-[#133E32] tracking-tight">
            True<span className="text-[#1B5E4A]">Care</span>
          </span>
        </Link>

        {currentUser ? (
          <>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? "bg-emerald-100 text-[#133E32]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                {dbUser?.role || "Patient"}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                Log Out
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 transition px-2 py-1"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[#1B5E4A] hover:bg-[#154b3b] text-white transition shadow-sm"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
