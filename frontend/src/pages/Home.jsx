import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { currentUser } = useAuth();

  const capabilities = [
    "AI symptom screening in seconds (Gemini 3.8 Flash)",
    "Real-time ER bed tracking & automated hospital intake",
    "Emergency 911 SOS ambulance beacon with GPS dispatch",
    "Specialist consultations & digital doctor prescriptions (Rx)",
    "Unified Electronic Health Record (EHR) timeline",
    "Emergency Medical ID with blood group & allergy tags",
  ];

  const pillars = [
    {
      title: "Immediate Triage",
      desc: "Input complex acute symptoms to receive clinical urgency levels categorized into Emergency, Doctor Consult, or Home Care.",
      linkText: "Try AI Symptom Checker",
      linkTo: currentUser ? "/diagnosis" : "/login",
    },
    {
      title: "Emergency Path",
      desc: "Locate open emergency rooms with live available bed counts, travel times, and instant 911 ambulance dispatch.",
      linkText: "Open Emergency ER Map",
      linkTo: currentUser ? "/emergency-map" : "/login",
    },
    {
      title: "Continuity of Care",
      desc: "Every prescription, consultation note, and hospital stay is synthesized into a permanent chronological health chart.",
      linkText: "View Health Records",
      linkTo: currentUser ? "/records" : "/login",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9FBFA] text-slate-900 flex flex-col font-sans">
      {/* Hero Section */}
      <section className="pt-12 pb-16 lg:pt-20 lg:pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Dhaka & Regional Healthcare Network
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Headline & Primary Actions */}
          <div className="lg:col-span-7">
            <h1 className="text-4xl sm:text-6xl font-black text-[#133E32] tracking-tight leading-[1.15] mb-6">
              Care closer than the <br />
              next clinic visit.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed mb-8">
              Check symptoms with an integrated AI clinical engine, book
              specialist doctors online, monitor hospital bed availability in
              real-time, and route emergency ambulances — all within one unified
              platform.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {currentUser ? (
                <>
                  <Link
                    to="/dashboard"
                    className="px-6 py-3.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-2xl text-sm transition shadow-md shadow-emerald-900/10"
                  >
                    Go to Patient Dashboard &rarr;
                  </Link>
                  <Link
                    to="/emergency-map"
                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-sm transition shadow-md shadow-red-200 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                    Emergency ER & SOS
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-6 py-3.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-2xl text-sm transition shadow-md shadow-emerald-900/10"
                  >
                    Create a patient account
                  </Link>
                  <Link
                    to="/login"
                    className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl text-sm transition border border-slate-300 shadow-sm"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Capabilities Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-7 border border-slate-200/90 shadow-sm">
              <h3 className="text-lg font-extrabold text-[#133E32] mb-4">
                What you can do
              </h3>

              <ul className="space-y-3">
                {capabilities.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B5E4A] mt-2 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Available 24/7 online</span>
                <Link
                  to={currentUser ? "/diagnosis" : "/login"}
                  className="font-bold text-[#1B5E4A] hover:underline"
                >
                  Start consultation &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Strategic Pillars Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-extrabold text-[#133E32] mb-2">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {pillar.desc}
                </p>
              </div>
              <Link
                to={pillar.linkTo}
                className="text-xs font-bold text-[#1B5E4A] hover:underline inline-flex items-center gap-1"
              >
                {pillar.linkText} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Upgraded Multi-Column Clinical Footer */}
      <footer className="mt-auto bg-[#0F2922] text-slate-300 border-t border-emerald-900/40">
        {/* Emergency Top Strip */}
        <div className="bg-red-600/95 text-white px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>
                CRITICAL EMERGENCY? Do not wait for an online consultation.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-extrabold tracking-wide">
                Dial 999 / 911 Immediately
              </span>
              <Link
                to={currentUser ? "/emergency-map" : "/login"}
                className="px-3 py-1 bg-white text-red-700 font-extrabold rounded-lg hover:bg-red-50 transition"
              >
                Launch SOS Map &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-10 border-b border-emerald-800/40">
            {/* Column 1: Brand & System Status */}
            <div className="lg:col-span-4 space-y-4">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#1B5E4A] text-white font-black text-lg flex items-center justify-center shadow-sm">
                  +
                </span>
                <span className="text-xl font-black text-white tracking-tight">
                  True<span className="text-emerald-400">Care</span>
                </span>
              </Link>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Next-generation telemedicine, AI symptom triage, real-time
                emergency room bed tracking, and automated 911 ambulance
                dispatch built for rapid clinical response.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[11px] text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Clinical & WebSocket Engines Operational
              </div>
            </div>

            {/* Column 2: Patient Care Modules */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Patient Care & Triage
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link
                    to={currentUser ? "/diagnosis" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    AI Symptom Checker (Gemini 3.8)
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/appointments" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Specialist Video Consultations
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/appointments" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Digital Prescriptions (e-Rx)
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/records" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Unified Health Records (EHR)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Emergency & Hospital Ops */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Emergency & Ops
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link
                    to={currentUser ? "/emergency-map" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Live ER Bed Radar
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/emergency-map" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    SOS Ambulance Beacon
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/profile" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Emergency Medical ID
                  </Link>
                </li>
                <li>
                  <Link
                    to={currentUser ? "/admin" : "/login"}
                    className="hover:text-emerald-300 transition"
                  >
                    Hospital Staff Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: 24/7 Dispatch & Security */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                24/7 Emergency Dispatch
              </h4>
              <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">National Emergency:</span>
                  <a
                    href="tel:999"
                    className="font-black text-red-400 hover:underline"
                  >
                    999 / 911
                  </a>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ER Trauma Desk:</span>
                  <a
                    href="tel:+15550192834"
                    className="font-bold text-white hover:underline"
                  >
                    +1 (555) 019-2834
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-emerald-800/40">
                  GPS-linked ambulance routing active across Dhaka & regional
                  trauma centers.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Legal & Disclaimer Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} TrueCare Telemedicine &
              Emergency Systems. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/40 text-slate-300">
                JWT & Firebase Auth
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/40 text-slate-300">
                Real-Time Socket.io
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800/40 text-slate-300">
                Encrypted MongoDB EHR
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
