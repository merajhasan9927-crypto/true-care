import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function MedicalRecords() {
  const { currentUser } = useAuth();
  const [recordsData, setRecordsData] = useState({
    patientProfile: {},
    summary: {},
    timeline: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchEHR = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(
          "${API_BASE_URL}/api/ehr/my-records",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (isMounted && res.data) {
          setRecordsData({
            patientProfile: res.data.patientProfile || {},
            summary: res.data.summary || {},
            timeline: Array.isArray(res.data.timeline) ? res.data.timeline : [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch EHR timeline:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEHR();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const { patientProfile, summary, timeline } = recordsData;

  const filterTabs = [
    { id: "ALL", label: "All Records" },
    { id: "AI_DIAGNOSIS", label: "AI Triage" },
    { id: "APPOINTMENT", label: "Consultations & Rx" },
    { id: "ER_ADMISSION", label: "ER Admissions" },
    { id: "SOS_DISPATCH", label: "SOS Dispatches" },
  ];

  const filteredTimeline = timeline.filter(item => {
    const matchesTab = activeFilter === "ALL" || item.type === activeFilter;
    const textBlob = `${item.title || ""} ${item.subtitle || ""} ${
      item.details || ""
    }`.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() || textBlob.includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const badgeStyleForType = type => {
    switch (type) {
      case "AI_DIAGNOSIS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "APPOINTMENT":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "ER_ADMISSION":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "SOS_DISPATCH":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/dashboard"
            className="text-blue-600 hover:underline mb-2 inline-block font-semibold text-sm"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Unified Electronic Health Record (EHR)
          </h1>
          <p className="text-slate-600 text-sm">
            Chronological clinical history synthesizing AI triage,
            consultations, digital Rx, and ER admissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          Print / Export Official EHR PDF
        </button>
      </div>

      {/* Patient Medical ID Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-md mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Patient Name
          </span>
          <p className="text-base font-extrabold mt-0.5">
            {patientProfile.name ||
              currentUser?.email?.split("@")[0] ||
              "Patient"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Blood Group
          </span>
          <p className="text-base font-extrabold text-red-400 mt-0.5">
            {patientProfile.bloodGroup || "Unknown"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Registered Allergies
          </span>
          <p className="text-xs font-semibold text-slate-200 mt-0.5">
            {patientProfile.allergies?.length
              ? patientProfile.allergies.join(", ")
              : "None reported"}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Chronic Conditions
          </span>
          <p className="text-xs font-semibold text-slate-200 mt-0.5">
            {patientProfile.chronicConditions?.length
              ? patientProfile.chronicConditions.join(", ")
              : "None reported"}
          </p>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            AI Assessments
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {summary.totalDiagnoses ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Doctor Consults
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {summary.totalAppointments ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            ER Admissions
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {summary.totalAdmissions ?? 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            SOS Dispatches
          </span>
          <p className="text-2xl font-black text-red-600 mt-1">
            {summary.totalDispatches ?? 0}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-[#1B5E4A] text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search symptoms, doctor, medication..."
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
        />
      </div>

      {/* Chronological Timeline */}
      {loading ? (
        <p className="text-slate-500 text-sm">Compiling clinical timeline...</p>
      ) : filteredTimeline.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 text-sm">
          No matching health records found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTimeline.map((event, index) => (
            <div
              key={event.id || index}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeStyleForType(
                      event.type,
                    )}`}
                  >
                    {event.type?.replace("_", " ")}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {event.title}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {event.date
                    ? new Date(event.date).toLocaleString()
                    : "Recorded Event"}
                </span>
              </div>

              {event.subtitle && (
                <p className="text-xs font-bold text-slate-600 mb-1">
                  {event.subtitle}
                </p>
              )}

              {event.details && (
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {event.details}
                </p>
              )}

              {/* Medications Pill Row if Prescription Exists */}
              {event.prescription?.medications?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-emerald-700 block mb-2">
                    Prescribed Medications (Rx):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {event.prescription.medications.map((med, mIdx) => (
                      <span
                        key={mIdx}
                        className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold"
                      >
                        {med.name} ({med.dosage}) — {med.frequency}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
