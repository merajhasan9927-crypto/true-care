import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [bedsAvailable, setBedsAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingBeds, setUpdatingBeds] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // ER Intake Form State
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [conditionSeverity, setConditionSeverity] = useState("Urgent");
  const [bedNumber, setBedNumber] = useState("");
  const [admitting, setAdmitting] = useState(false);

  // Prescription Modal State
  const [activePrescribeApp, setActivePrescribeApp] = useState(null);
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxAdvice, setRxAdvice] = useState("");
  const [meds, setMeds] = useState([
    {
      name: "",
      dosage: "",
      frequency: "Twice daily after meals",
      duration: "5 days",
    },
  ]);
  const [submittingRx, setSubmittingRx] = useState(false);

  // Dispatch Assignment Modal State
  const [activeDeploy, setActiveDeploy] = useState(null);
  const [ambulanceUnit, setAmbulanceUnit] = useState("Unit Alpha-9");
  const [driverContact, setDriverContact] = useState("+1 (555) 018-3321");
  const [dispatchEta, setDispatchEta] = useState("7 mins");

  const loadHospitalData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [appRes, statsRes, dispatchRes] = await Promise.all([
        axios.get("${API_BASE_URL}/api/appointments", { headers }),
        axios.get("${API_BASE_URL}/api/admin/stats", { headers }),
        axios.get("${API_BASE_URL}/api/dispatch/active", { headers }),
      ]);

      setAppointments(appRes.data.appointments || appRes.data || []);
      if (statsRes.data?.erBedsAvailable !== undefined) {
        setBedsAvailable(statsRes.data.erBedsAvailable);
      }
      if (statsRes.data?.activeAdmissions) {
        setAdmissions(statsRes.data.activeAdmissions);
      }
      if (dispatchRes.data?.dispatches) {
        setDispatches(dispatchRes.data.dispatches);
      }
    } catch (err) {
      console.error("Failed to load hospital data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // 1. Initial Data Fetch
  useEffect(() => {
    loadHospitalData();
  }, [loadHospitalData]);

  // 2. Real-Time Socket.io Subscription
  useEffect(() => {
    const socket = io("${API_BASE_URL}", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("hospital_updated", payload => {
      if (payload?.erBedsAvailable !== undefined) {
        setBedsAvailable(payload.erBedsAvailable);
      }
      loadHospitalData();
    });

    socket.on("dispatch_updated", () => {
      loadHospitalData();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadHospitalData]);

  const handleBedUpdate = async delta => {
    const updatedCount = Math.max(0, bedsAvailable + delta);
    setUpdatingBeds(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.patch(
        "${API_BASE_URL}/api/admin/beds",
        {
          erBedsAvailable: updatedCount,
          hospitalName: "City Central Emergency Hospital",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setBedsAvailable(res.data.erBedsAvailable);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update bed count.");
    } finally {
      setUpdatingBeds(false);
    }
  };

  const handleAdmit = async e => {
    e.preventDefault();
    if (bedsAvailable <= 0) {
      alert("Cannot admit: 0 ER beds remaining!");
      return;
    }
    setAdmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(
        "${API_BASE_URL}/api/admin/admit",
        { patientName, patientEmail, conditionSeverity, bedNumber },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAdmissions([res.data.admission, ...admissions]);
      setBedsAvailable(res.data.erBedsAvailable);
      setPatientName("");
      setPatientEmail("");
      setBedNumber("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to admit patient.");
    } finally {
      setAdmitting(false);
    }
  };

  const handleDischarge = async id => {
    if (!window.confirm("Confirm patient discharge and bed restoration?"))
      return;
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.patch(
        `${API_BASE_URL}/api/admin/discharge/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAdmissions(admissions.filter(adm => adm._id !== id));
      setBedsAvailable(res.data.erBedsAvailable);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to discharge patient.");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(
        `${API_BASE_URL}/api/appointments/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setAppointments(prev =>
        prev.map(app =>
          app._id === id || app.id === id ? { ...app, status } : app,
        ),
      );
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAddMedication = () => {
    setMeds([
      ...meds,
      { name: "", dosage: "", frequency: "Once daily", duration: "7 days" },
    ]);
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...meds];
    updated[index][field] = value;
    setMeds(updated);
  };

  const handleRemoveMedication = index => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  const handleIssueRxSubmit = async e => {
    e.preventDefault();
    if (!activePrescribeApp) return;

    setSubmittingRx(true);
    try {
      const token = await currentUser.getIdToken();
      const filteredMeds = meds.filter(m => m.name.trim() !== "");

      const res = await axios.post(
        `${API_BASE_URL}/api/appointments/${activePrescribeApp._id}/prescribe`,
        {
          diagnosisSummary: rxDiagnosis,
          doctorAdvice: rxAdvice,
          medications: filteredMeds,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setAppointments(prev =>
        prev.map(a =>
          a._id === activePrescribeApp._id ? res.data.appointment : a,
        ),
      );
      setActivePrescribeApp(null);
      setRxDiagnosis("");
      setRxAdvice("");
      setMeds([
        {
          name: "",
          dosage: "",
          frequency: "Twice daily after meals",
          duration: "5 days",
        },
      ]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to issue prescription.");
    } finally {
      setSubmittingRx(false);
    }
  };

  const handleDeployAmbulanceSubmit = async e => {
    e.preventDefault();
    if (!activeDeploy) return;

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.patch(
        `${API_BASE_URL}/api/dispatch/${activeDeploy._id}/deploy`,
        {
          ambulanceUnit,
          driverContact,
          eta: dispatchEta,
          status: "en-route",
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setDispatches(prev =>
        prev.map(d => (d._id === activeDeploy._id ? res.data.dispatch : d)),
      );
      setActiveDeploy(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to deploy ambulance.");
    }
  };

  const handleResolveDispatch = async id => {
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(
        `${API_BASE_URL}/api/dispatch/${id}/resolve`,
        { status: "resolved" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDispatches(prev => prev.filter(d => d._id !== id));
    } catch {
      alert("Failed to resolve dispatch.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link
        to="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block font-semibold text-sm"
      >
        &larr; Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Hospital Operations & ER Management
          </h1>
          <p className="text-slate-600">
            Live emergency intake, bed allocation, 911 ambulance dispatch, and
            triage queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${
              socketConnected
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? "bg-emerald-600 animate-ping" : "bg-slate-400"
              }`}
            />
            {socketConnected ? "Live Socket Active" : "Offline"}
          </span>
          <button
            onClick={loadHospitalData}
            className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold text-slate-500">
              Live ER Beds
            </p>
            <h3 className="text-3xl font-extrabold text-slate-800 mt-1">
              {loading ? "..." : bedsAvailable}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleBedUpdate(-1)}
              disabled={updatingBeds || bedsAvailable <= 0}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition disabled:opacity-50 cursor-pointer"
            >
              -
            </button>
            <button
              onClick={() => handleBedUpdate(1)}
              disabled={updatingBeds}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-50 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">
            Active SOS Dispatches
          </p>
          <h3 className="text-3xl font-extrabold text-red-600 mt-1">
            {dispatches.length}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">
            Currently Admitted
          </p>
          <h3 className="text-3xl font-extrabold text-blue-600 mt-1">
            {admissions.length}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">
            Pending Outpatient
          </p>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
            {
              appointments.filter(a => (a.status || "pending") === "pending")
                .length
            }
          </h3>
        </div>
      </div>

      {/* Emergency SOS Ambulance Queue Section */}
      <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm overflow-hidden mb-10">
        <div className="p-6 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-extrabold text-red-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
              Live Emergency SOS Ambulance Response Queue
            </h2>
            <p className="text-xs text-red-700">
              Immediate dispatch beacons transmitted from patients via
              WebSocket.
            </p>
          </div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
            {dispatches.length} Active Calls
          </span>
        </div>

        {dispatches.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No emergency SOS alerts active currently.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="py-3 px-6">Patient & Medical ID</th>
                  <th className="py-3 px-6">Coordinates & Note</th>
                  <th className="py-3 px-6">Assigned Vehicle / Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {dispatches.map(disp => (
                  <tr key={disp._id} className="hover:bg-red-50/20">
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 block">
                        {disp.patientName}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        Phone: {disp.patientPhone}
                      </span>
                      <span className="inline-block mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        Blood: {disp.bloodGroup} | Allergies:{" "}
                        {disp.allergies?.join(", ") || "None"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs max-w-xs">
                      <p className="font-mono text-slate-500 mb-1">
                        GPS: {disp.lat.toFixed(4)}, {disp.lng.toFixed(4)}
                      </p>
                      <p className="text-slate-700 italic">
                        "{disp.emergencyNote}"
                      </p>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase mb-1 ${
                          disp.status === "pending"
                            ? "bg-red-100 text-red-800 animate-pulse"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {disp.status}
                      </span>
                      {disp.ambulanceUnit && (
                        <p className="text-xs text-slate-500">
                          {disp.ambulanceUnit} (ETA: {disp.eta})
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {disp.status === "pending" ? (
                        <button
                          onClick={() => setActiveDeploy(disp)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition shadow-sm cursor-pointer"
                        >
                          Deploy Unit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolveDispatch(disp._id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Resolve Arrival
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ER Admission Desk & Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Admit ER Patient
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Allocates a bed and broadcasts live capacity.
          </p>

          <form onSubmit={handleAdmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Patient Name
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="e.g. Jordan Miller"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Registered Email (Optional)
              </label>
              <input
                type="email"
                value={patientEmail}
                onChange={e => setPatientEmail(e.target.value)}
                placeholder="Connects Medical ID automatically"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Bed Unit
                </label>
                <input
                  type="text"
                  required
                  value={bedNumber}
                  onChange={e => setBedNumber(e.target.value)}
                  placeholder="e.g. ER-04"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Severity
                </label>
                <select
                  value={conditionSeverity}
                  onChange={e => setConditionSeverity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Critical">Critical</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Observation">Observation</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={admitting || bedsAvailable <= 0}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition disabled:bg-slate-300 shadow-sm cursor-pointer"
            >
              {admitting ? "Assigning Bed..." : "Admit & Reserve Bed"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Currently Admitted in ER
              </h2>
              <p className="text-xs text-slate-500">
                Live roster of patients occupying ER beds.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {admissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No active patients admitted to emergency beds.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-6">Bed & Patient</th>
                    <th className="py-3 px-6">Medical ID</th>
                    <th className="py-3 px-6">Triage Severity</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {admissions.map(adm => (
                    <tr key={adm._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-800 block">
                          {adm.patientName}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                          Bed: {adm.bedNumber}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xs">
                        <span className="block font-semibold text-slate-700">
                          Blood:{" "}
                          <span className="text-blue-600">
                            {adm.bloodGroup}
                          </span>
                        </span>
                        <span className="text-slate-400 block truncate max-w-xs">
                          Allergies:{" "}
                          {adm.allergies?.length
                            ? adm.allergies.join(", ")
                            : "None reported"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            adm.conditionSeverity === "Critical"
                              ? "bg-red-100 text-red-800 animate-pulse"
                              : adm.conditionSeverity === "Urgent"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {adm.conditionSeverity}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDischarge(adm._id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
                        >
                          Discharge & Free Bed
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Specialist Consultation Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            Specialist Consultation Queue
          </h2>
          <p className="text-xs text-slate-500">
            Incoming appointment bookings from patients.
          </p>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No appointment requests recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="py-3 px-6">Doctor</th>
                  <th className="py-3 px-6">Date & Slot</th>
                  <th className="py-3 px-6">Clinical Reason</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {appointments.map(app => {
                  const id = app._id || app.id;
                  const currentStatus = app.status || "pending";
                  return (
                    <tr key={id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {app.doctorName}
                        <span className="block text-xs font-normal text-slate-500">
                          {app.specialty}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {app.date}
                        <span className="block text-xs text-slate-500">
                          {app.timeSlot}
                        </span>
                      </td>
                      <td
                        className="py-4 px-6 max-w-xs truncate"
                        title={app.reason}
                      >
                        {app.reason}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                            currentStatus === "completed"
                              ? "bg-blue-100 text-blue-800"
                              : currentStatus === "confirmed"
                                ? "bg-emerald-100 text-emerald-800"
                                : currentStatus === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        {currentStatus === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(id, "confirmed")
                              }
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-xs transition cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => handleStatusChange(id, "rejected")}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded text-xs transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {currentStatus === "confirmed" && (
                          <button
                            onClick={() => setActivePrescribeApp(app)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs transition shadow-sm cursor-pointer"
                          >
                            Prescribe & Complete
                          </button>
                        )}
                        {currentStatus === "completed" && (
                          <span className="text-xs font-semibold text-emerald-600">
                            Rx Issued
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ambulance Deployment Modal */}
      {activeDeploy && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              Dispatch Ambulance Unit
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Deploy vehicle for {activeDeploy.patientName} (
              {activeDeploy.lat.toFixed(4)}, {activeDeploy.lng.toFixed(4)})
            </p>

            <form onSubmit={handleDeployAmbulanceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ambulance ID
                </label>
                <input
                  type="text"
                  required
                  value={ambulanceUnit}
                  onChange={e => setAmbulanceUnit(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Driver Contact
                </label>
                <input
                  type="text"
                  required
                  value={driverContact}
                  onChange={e => setDriverContact(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Estimated Arrival Time (ETA)
                </label>
                <input
                  type="text"
                  required
                  value={dispatchEta}
                  onChange={e => setDispatchEta(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDeploy(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Deploy Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Prescription Modal */}
      {activePrescribeApp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  Issue Digital Prescription (Rx)
                </h3>
                <p className="text-xs text-slate-500">
                  Patient Consultation for {activePrescribeApp.doctorName}
                </p>
              </div>
              <button
                onClick={() => setActivePrescribeApp(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleIssueRxSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Clinical Diagnosis Summary
                </label>
                <input
                  type="text"
                  required
                  value={rxDiagnosis}
                  onChange={e => setRxDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase">
                    Prescribed Medications
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedication}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    + Add Medication
                  </button>
                </div>

                <div className="space-y-3">
                  {meds.map((med, index) => (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Drug Name"
                        value={med.name}
                        onChange={e =>
                          handleMedChange(index, "name", e.target.value)
                        }
                        className="p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage}
                        onChange={e =>
                          handleMedChange(index, "dosage", e.target.value)
                        }
                        className="p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency}
                        onChange={e =>
                          handleMedChange(index, "frequency", e.target.value)
                        }
                        className="p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 outline-none"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Duration"
                          value={med.duration}
                          onChange={e =>
                            handleMedChange(index, "duration", e.target.value)
                          }
                          className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-800 outline-none"
                        />
                        {meds.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(index)}
                            className="text-red-500 hover:text-red-700 font-bold px-1 cursor-pointer"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Physician Advice
                </label>
                <textarea
                  rows="2"
                  value={rxAdvice}
                  onChange={e => setRxAdvice(e.target.value)}
                  placeholder="e.g. Rest, increase fluid intake..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePrescribeApp(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  {submittingRx
                    ? "Signing & Issuing..."
                    : "Complete & Issue Rx"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
