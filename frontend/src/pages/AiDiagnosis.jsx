import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AiDiagnosis() {
  const { currentUser } = useAuth();
  const [symptomsInput, setSymptomsInput] = useState("");
  const [symptomsList, setSymptomsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch past diagnosis records
  const fetchHistory = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get("https://true-care-production.up.railway.app/api/ai/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data.history || []);
    } catch (err) {
      console.error("Failed to load diagnosis history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentUser]);

  const handleAddSymptom = e => {
    e.preventDefault();
    if (!symptomsInput.trim()) return;
    if (!symptomsList.includes(symptomsInput.trim().toLowerCase())) {
      setSymptomsList([...symptomsList, symptomsInput.trim().toLowerCase()]);
    }
    setSymptomsInput("");
  };

  const handleRemoveSymptom = toRemove => {
    setSymptomsList(symptomsList.filter(s => s !== toRemove));
  };

  const handleAnalyze = async () => {
    if (symptomsList.length === 0) return;
    setLoading(true);
    setResult(null);

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(
        "https://true-care-production.up.railway.app/api/ai/diagnose",
        { symptoms: symptomsList },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const raw = res.data?.diagnosis || res.data || {};
      const newRec = {
        _id: raw._id || Date.now().toString(),
        symptoms: Array.isArray(raw.symptoms) ? raw.symptoms : [...symptomsList],
        recommendedAction: raw.recommendedAction || "consult-doctor",
        aiAnalysis: raw.aiAnalysis || raw.summary || "",
        createdAt: raw.createdAt || new Date().toISOString(),
      };
      const storageKey = "tc_diag_" + (currentUser?.uid || "guest");
      const localList = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [newRec, ...localList];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setResult(raw);
      setHistory(updated);
      fetchHistory();
    } catch (err) {
      console.error("Diagnosis error:", err);
      alert(err.response?.data?.message || "Failed to analyze symptoms.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block font-semibold text-sm"
      >
        &larr; Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">
          AI Symptom Triage & Clinical Assistant
        </h1>
        <p className="text-slate-600">
          Describe your symptoms to receive automated triage assessments and
          persistent medical records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Triage Generator Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Input Symptoms
            </h2>
            <form onSubmit={handleAddSymptom} className="flex gap-2 mb-4">
              <input
                type="text"
                value={symptomsInput}
                onChange={e => setSymptomsInput(e.target.value)}
                placeholder="e.g. fever, acute chest tightness, dry cough..."
                className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm transition"
              >
                Add
              </button>
            </form>

            {symptomsList.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {symptomsList.map((sym, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {sym}
                    <button
                      type="button"
                      onClick={() => handleRemoveSymptom(sym)}
                      className="text-blue-400 hover:text-blue-700 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || symptomsList.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:bg-blue-300"
            >
              {loading
                ? "Analyzing Clinical Indicators..."
                : "Analyze Symptoms with AI"}
            </button>
          </div>

          {/* Diagnosis Result Card */}
          {result && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">
                  Triage Assessment
                </h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    result.recommendedAction === "emergency"
                      ? "bg-red-100 text-red-800 animate-pulse"
                      : result.recommendedAction === "consult-doctor"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {result.recommendedAction.replace("-", " ")}
                </span>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {result.aiAnalysis}
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                {result.recommendedAction === "emergency" && (
                  <Link
                    to="/emergency-map"
                    className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                  >
                    Locate Nearest Emergency ER &rarr;
                  </Link>
                )}
                {result.recommendedAction === "consult-doctor" && (
                  <Link
                    to="/appointments"
                    className="flex-1 text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition"
                  >
                    Schedule Specialist Consultation &rarr;
                  </Link>
                )}
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
                >
                  Print Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Diagnostic Medical History Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Past Diagnoses</h2>
            <button
              onClick={fetchHistory}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>

          {historyLoading ? (
            <p className="text-xs text-slate-500">
              Loading diagnostic records...
            </p>
          ) : history.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-400">
                No past diagnoses recorded.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-150 overflow-y-auto pr-1">
              {history.map(record => (
                <div
                  key={record._id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        record.recommendedAction === "emergency"
                          ? "bg-red-100 text-red-700"
                          : record.recommendedAction === "consult-doctor"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {record.recommendedAction}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-slate-600 font-medium">
                    <span className="text-slate-400">Symptoms:</span>{" "}
                    {record.symptoms.join(", ")}
                  </p>

                  <p className="text-slate-500 line-clamp-3">
                    {record.aiAnalysis}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
