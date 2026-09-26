import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { currentUser, dbUser, switchRole } = useAuth();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [activeSOS, setActiveSOS] = useState(null);
  const [ehrSummary, setEhrSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [profRes, appRes, sosRes, ehrRes] = await Promise.allSettled([
          axios.get("${API_BASE_URL}/api/auth/profile", { headers }),
          axios.get("${API_BASE_URL}/api/appointments/my", { headers }),
          axios.get("${API_BASE_URL}/api/dispatch/my-active", {
            headers,
          }),
          axios.get("${API_BASE_URL}/api/ehr/my-records", { headers }),
        ]);

        if (!isMounted) return;

        if (profRes.status === "fulfilled") {
          setProfile(profRes.value.data.user);
        }
        if (appRes.status === "fulfilled") {
          const list =
            appRes.value.data.appointments || appRes.value.data || [];
          setAppointments(Array.isArray(list) ? list : []);
        }
        if (sosRes.status === "fulfilled") {
          setActiveSOS(sosRes.value.data.dispatch || null);
        }
        if (ehrRes.status === "fulfilled") {
          setEhrSummary(ehrRes.value.data.summary || null);
        }
      } catch (err) {
        console.error("Dashboard telemetry error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const activeRole = dbUser?.role || profile?.role || "patient";
  const displayName =
    profile?.name ||
    dbUser?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Patient";

  const quickModules = [
    {
      title: "AI Symptom Triage",
      badge: "Gemini 3.8",
      badgeColor: "bg-blue-100 text-blue-700",
      desc: "Analyze acute symptoms for instant urgency categorization and specialist advice.",
      path: "/diagnosis",
      cta: "Start AI Check",
    },
    {
      title: "Emergency ER & SOS Map",
      badge: "Live GPS",
      badgeColor: "bg-red-100 text-red-700",
      desc: "View real-time hospital ER bed capacities or trigger an immediate 911 ambulance.",
      path: "/emergency-map",
      cta: "Open Emergency Radar",
    },
    {
      title: "Doctor Consultations",
      badge: "Outpatient",
      badgeColor: "bg-emerald-100 text-emerald-800",
      desc: "Schedule specialist visits and download digitally signed prescriptions (Rx).",
      path: "/appointments",
      cta: "Book or View Visits",
    },
    {
      title: "Unified Health Records",
      badge: "EHR Timeline",
      badgeColor: "bg-purple-100 text-purple-700",
      desc: "Chronological medical chart of all AI assessments, ER stays, and medications.",
      path: "/records",
      cta: "Open Medical Chart",
    },
    {
      title: "Emergency Medical ID",
      badge: "ICE Profile",
      badgeColor: "bg-amber-100 text-amber-800",
      desc: "Configure blood group, critical allergies, chronic conditions, and emergency contacts.",
      path: "/profile",
      cta: "Update Medical ID",
    },
    {
      title: "Hospital Operations Portal",
      badge: "Staff / Admin",
      badgeColor: "bg-slate-200 text-slate-800",
      desc: "Manage live ER bed counts, admit/discharge patients, deploy ambulances, and issue Rx.",
      path: "/admin",
      cta: "Launch Staff Ops",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Active SOS Alert Banner */}
      {activeSOS && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-white/20 tracking-wider">
              Active SOS Dispatch • {activeSOS.status}
            </span>
            <h3 className="text-lg font-extrabold mt-1">
              Ambulance {activeSOS.ambulanceUnit || "Dispatched"} — ETA:{" "}
              {activeSOS.eta}
            </h3>
            <p className="text-xs text-red-100">
              Note: "{activeSOS.emergencyNote}"
            </p>
          </div>
          <Link
            to="/emergency-map"
            className="px-4 py-2 bg-white text-red-700 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-sm hover:bg-red-50 transition"
          >
            Track Live Map &rarr;
          </Link>
        </div>
      )}

      {/* Top Welcome & Role Switcher Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#1B5E4A] border border-emerald-200">
              {activeRole} Portal
            </span>
            <span className="text-xs text-slate-400">{currentUser?.email}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Your clinical intelligence, emergency response tools, and health
            records are synced in real time.
          </p>
        </div>

        {/* Instant Role Switcher Pill */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase text-slate-500 px-2">
            View As:
          </span>
          {["patient", "doctor", "admin"].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => switchRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                activeRole === r
                  ? "bg-[#1B5E4A] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Live Clinical Telemetry Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">
            Blood Group
          </span>
          <p className="text-2xl font-black text-red-600 mt-1">
            {loading ? "..." : profile?.bloodGroup || "Unknown"}
          </p>
          <Link
            to="/profile"
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            {profile?.allergies?.length
              ? `${profile.allergies.length} Allergy Alert(s)`
              : "Edit Medical ID →"}
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">
            Consultations
          </span>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {loading ? "..." : appointments.length}
          </p>
          <Link
            to="/appointments"
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            {appointments.filter(a => a.status === "completed").length} Digital
            Rx Issued →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">
            AI Symptom Checks
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {loading ? "..." : (ehrSummary?.totalDiagnoses ?? 0)}
          </p>
          <Link
            to="/diagnosis"
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            Run New Triage →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">
            Total EHR Events
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {loading ? "..." : (ehrSummary?.totalEvents ?? 0)}
          </p>
          <Link
            to="/records"
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            View Full Timeline →
          </Link>
        </div>
      </div>

      {/* 6 Module Cards */}
      <h2 className="text-lg font-extrabold text-slate-800 mb-4">
        Clinical & Emergency Modules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickModules.map((mod, i) => (
          <Link
            key={i}
            to={mod.path}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${mod.badgeColor}`}
                >
                  {mod.badge}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1.5 group-hover:text-[#1B5E4A] transition">
                {mod.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {mod.desc}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1B5E4A]">
              <span>{mod.cta}</span>
              <span className="group-hover:translate-x-1 transition-transform">
                &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
