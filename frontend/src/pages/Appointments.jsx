import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const SPECIALISTS = [
  { name: "Dr. Ariful Islam", specialty: "Cardiology & Internal Medicine" },
  { name: "Dr. Nusrat Jahan", specialty: "Neurology & Stroke Care" },
  { name: "Dr. Tanvir Ahmed", specialty: "Pulmonology & Critical Care" },
  { name: "Dr. Farhana Rahman", specialty: "Pediatrics & Family Medicine" },
  { name: "Dr. Mahmudul Hasan", specialty: "Orthopedics & Trauma Surgery" },
];

const TIME_SLOTS = ["09:30 AM", "11:00 AM", "02:00 PM", "04:30 PM", "07:00 PM"];

export default function Appointments() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Booking Form State
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [reason, setReason] = useState("");

  // Printable Rx Modal State
  const [selectedRxApp, setSelectedRxApp] = useState(null);

  // Live Video Consultation Room State
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    if (!currentUser) {
      return;
    }

    currentUser
      .getIdToken()
      .then(token =>
        axios.get("${API_BASE_URL}/api/appointments/my", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      )
      .then(res => {
        if (!isMounted) return;
        const list = res.data.appointments || res.data || [];
        setAppointments(Array.isArray(list) ? list : []);
      })
      .catch(err => {
        console.error("Failed to fetch appointments:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Video Call Timer
  useEffect(() => {
    if (!activeVideoCall) return;
    const interval = setInterval(() => {
      setCallSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeVideoCall]);

  // Start Camera & Mic when Video Room opens
  const startVideoConsult = async appointment => {
    setActiveVideoCall(appointment);
    setCallSeconds(0);
    setMicEnabled(true);
    setCamEnabled(true);
    setChatMessages([
      {
        sender: appointment.doctorName,
        text: `Hello! I have reviewed your reason for visit ("${appointment.reason}"). How are you feeling right now?`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera/Mic permission note:", err.message);
    }
  };

  const endVideoConsult = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setActiveVideoCall(null);
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
  };

  const toggleCam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !camEnabled;
      });
    }
    setCamEnabled(!camEnabled);
  };

  const handleSendChat = e => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = {
      sender: "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: activeVideoCall?.doctorName || "Specialist",
          text: "Noted in your clinical chart. I will issue your digital prescription (Rx) right after this session.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }, 1200);
  };

  const formatDuration = secs => {
    const mins = String(Math.floor(secs / 60)).padStart(2, "0");
    const rem = String(secs % 60).padStart(2, "0");
    return `${mins}:${rem}`;
  };

  const handleBookAppointment = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    const chosenDoc = SPECIALISTS[selectedDocIndex];

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(
        "${API_BASE_URL}/api/appointments",
        {
          doctorName: chosenDoc.name,
          specialty: chosenDoc.specialty,
          date,
          timeSlot,
          reason,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const created = res.data.appointment || res.data;
      setAppointments([created, ...appointments]);
      setReason("");
      setDate("");
      setMessage({
        type: "success",
        text: `Appointment requested with ${chosenDoc.name}!`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to book appointment.",
      });
    } finally {
      setSubmitting(false);
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

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">
          Specialist Consultations, Telemedicine & Digital Rx
        </h1>
        <p className="text-slate-600 text-sm">
          Book outpatient visits, join live browser video consultations, and
          download signed prescriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Book Consultation Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-lg font-extrabold text-slate-800 mb-1">
            Book a Specialist
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Select a specialist and preferred slot for in-person or video
            consultation.
          </p>

          {message.text && (
            <div
              className={`p-3 rounded-xl mb-4 text-xs font-bold ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleBookAppointment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Specialist Doctor
              </label>
              <select
                value={selectedDocIndex}
                onChange={e => setSelectedDocIndex(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {SPECIALISTS.map((doc, idx) => (
                  <option key={idx} value={idx}>
                    {doc.name} — {doc.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Time Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Primary Symptoms / Reason for Visit
              </label>
              <textarea
                rows="3"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe your symptoms, duration, or follow-up questions..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Scheduling..." : "Confirm Booking Request"}
            </button>
          </form>
        </div>

        {/* Right: Appointments & Digital Rx List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-extrabold text-slate-800">
            Your Scheduled Visits & Prescriptions ({appointments.length})
          </h2>

          {loading ? (
            <p className="text-slate-500 text-sm">
              Loading your consultations...
            </p>
          ) : appointments.length === 0 ? (
            <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400 text-sm">
              No specialist appointments booked yet. Use the form on the left to
              schedule your first visit.
            </div>
          ) : (
            appointments.map(app => {
              const status = app.status || "pending";
              const hasRx =
                status === "completed" &&
                (app.prescription?.diagnosisSummary ||
                  app.prescription?.medications?.length > 0);

              return (
                <div
                  key={app._id || app.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold uppercase text-[#1B5E4A] block">
                        {app.specialty}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {app.doctorName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Date: <b>{app.date}</b> at <b>{app.timeSlot}</b>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {status}
                      </span>

                      {(status === "confirmed" || status === "pending") && (
                        <button
                          type="button"
                          onClick={() => startVideoConsult(app)}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          Join Video Consult
                        </button>
                      )}

                      {hasRx && (
                        <button
                          type="button"
                          onClick={() => setSelectedRxApp(app)}
                          className="px-3.5 py-1.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                        >
                          View & Print Rx
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600">
                    <b className="text-slate-800">Reason for Visit:</b>{" "}
                    {app.reason}
                  </p>

                  {/* Embedded Digital Prescription Summary */}
                  {hasRx && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                          Digital Prescription (Rx) Issued
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Diagnosis: <b>{app.prescription.diagnosisSummary}</b>
                        </span>
                      </div>

                      {app.prescription.medications?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {app.prescription.medications.map((med, i) => (
                            <div
                              key={i}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs"
                            >
                              <p className="font-bold text-slate-800">
                                {med.name} ({med.dosage})
                              </p>
                              <p className="text-slate-500">
                                {med.frequency} • {med.duration}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Browser Video Consultation Modal */}
      {activeVideoCall && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-800 grid grid-cols-1 lg:grid-cols-3">
            {/* Video Stream Feed */}
            <div className="lg:col-span-2 p-6 flex flex-col justify-between bg-slate-950 min-h-[420px] relative">
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    LIVE • {formatDuration(callSeconds)}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold">
                      {activeVideoCall.doctorName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {activeVideoCall.specialty}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 font-semibold">
                  Encrypted Telemedicine Channel
                </span>
              </div>

              {/* Simulated Remote Doctor Feed & Local Patient Camera PIP */}
              <div className="my-6 flex-1 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden p-6">
                <div className="w-20 h-20 rounded-full bg-[#1B5E4A] text-white font-black text-2xl flex items-center justify-center mb-3 shadow-lg">
                  Dr
                </div>
                <p className="font-bold text-base">
                  {activeVideoCall.doctorName}
                </p>
                <p className="text-xs text-emerald-400 mt-0.5">
                  Connected • Reviewing Patient EHR Chart
                </p>

                {/* Local Patient Webcam Stream */}
                <div className="absolute bottom-4 right-4 w-44 h-32 bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-2 text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded text-white">
                    You {camEnabled ? "" : "(Camera Off)"}
                  </span>
                </div>
              </div>

              {/* Call Control Bar */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    micEnabled
                      ? "bg-slate-800 hover:bg-slate-700 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {micEnabled ? "Mute Mic" : "Unmute Mic"}
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    camEnabled
                      ? "bg-slate-800 hover:bg-slate-700 text-white"
                      : "bg-amber-600 text-white"
                  }`}
                >
                  {camEnabled ? "Stop Video" : "Start Video"}
                </button>
                <button
                  type="button"
                  onClick={endVideoConsult}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
                >
                  End Consultation
                </button>
              </div>
            </div>

            {/* Right Column: Live Consultation Chat & Notes */}
            <div className="p-5 bg-slate-900 border-l border-slate-800 flex flex-col justify-between max-h-[520px]">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-800">
                  In-Call Clinical Chat
                </h4>
                <div className="space-y-3 py-4 overflow-y-auto max-h-[360px] pr-1">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-xs ${
                        msg.sender === "You"
                          ? "bg-blue-600 text-white ml-6"
                          : "bg-slate-800 text-slate-200 mr-6"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] opacity-75 mb-1 font-bold">
                        <span>{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleSendChat}
                className="flex gap-2 pt-3 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type symptoms or question..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official Digital Prescription (Rx) Modal */}
      {selectedRxApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start border-b-2 border-[#1B5E4A] pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-7 h-7 rounded-lg bg-[#1B5E4A] text-white font-black flex items-center justify-center text-sm">
                    +
                  </span>
                  <span className="text-lg font-black text-[#133E32]">
                    TrueCare Clinical Network
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Official Electronic Medical Prescription (e-Rx)
                </p>
              </div>
              <div className="text-right">
                <h4 className="font-extrabold text-slate-800 text-sm">
                  {selectedRxApp.doctorName}
                </h4>
                <p className="text-xs text-[#1B5E4A] font-semibold">
                  {selectedRxApp.specialty}
                </p>
                <p className="text-[11px] text-slate-400">
                  Date: {selectedRxApp.date}
                </p>
              </div>
            </div>

            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block">Patient Account</span>
                <span className="font-bold text-slate-800">
                  {currentUser?.email}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Clinical Diagnosis</span>
                <span className="font-bold text-blue-700">
                  {selectedRxApp.prescription?.diagnosisSummary ||
                    "Clinical Evaluation"}
                </span>
              </div>
            </div>

            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Rx — Prescribed Medications
            </h5>
            <div className="space-y-2.5 mb-6">
              {selectedRxApp.prescription?.medications?.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {idx + 1}. {med.name}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                      {med.dosage}
                    </span>
                    <p className="text-slate-500 mt-1">{med.frequency}</p>
                  </div>
                  <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                    {med.duration}
                  </span>
                </div>
              ))}
            </div>

            {selectedRxApp.prescription?.doctorAdvice && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 block mb-1">
                  Physician Instructions & Follow-Up Advice:
                </span>
                <p className="text-emerald-800">
                  {selectedRxApp.prescription.doctorAdvice}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRxApp(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                Print / Save Rx as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
