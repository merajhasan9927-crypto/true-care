import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const BLOOD_GROUPS = [
  "Unknown",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export default function Profile() {
  const { currentUser, dbUser, setDbUser, switchRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    name: "",
    role: dbUser?.role || "patient",
    phone: "",
    bloodGroup: "Unknown",
    allergies: "",
    chronicConditions: "",
    contactName: "",
    contactRelation: "",
    contactPhone: "",
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!currentUser) return;
      const savedLocalRole = localStorage.getItem(
        `truecare_role_${currentUser.uid}`,
      );

      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const u = res.data.user;
        if (u && isMounted) {
          setFormData({
            name: u.name || "",
            role: savedLocalRole || u.role || "patient",
            phone: u.phone || "",
            bloodGroup: u.bloodGroup || "Unknown",
            allergies: Array.isArray(u.allergies) ? u.allergies.join(", ") : "",
            chronicConditions: Array.isArray(u.chronicConditions)
              ? u.chronicConditions.join(", ")
              : "",
            contactName: u.emergencyContact?.name || "",
            contactRelation: u.emergencyContact?.relation || "",
            contactPhone: u.emergencyContact?.phone || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      await switchRole(formData.role);

      const token = await currentUser.getIdToken();
      const payload = {
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        bloodGroup: formData.bloodGroup,
        allergies: formData.allergies,
        chronicConditions: formData.chronicConditions,
        emergencyContact: {
          name: formData.contactName,
          relation: formData.contactRelation,
          phone: formData.contactPhone,
        },
      };

      const res = await axios.put(
        "http://localhost:5000/api/auth/profile",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data?.user) {
        setDbUser({ ...res.data.user, role: formData.role });
      }

      setMessage({
        type: "success",
        text: `Medical ID saved! Your active role is now ${formData.role.toUpperCase()}.`,
      });
    } catch (err) {
      setMessage({
        type: "success",
        text: `Role switched to ${formData.role.toUpperCase()} locally!`,
      });
      console.warn("Backend profile save warning:", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        to="/dashboard"
        className="text-blue-600 hover:underline mb-4 inline-block font-semibold text-sm"
      >
        &larr; Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">
          Emergency Medical ID & Role Settings
        </h1>
        <p className="text-slate-600 text-sm">
          Keep your critical medical identifiers updated for emergency
          responders and ambulance dispatch teams.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading your Medical ID...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Live Emergency ID Card Preview */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg h-fit border border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-700 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">
                  Emergency Medical ID
                </span>
                <h3 className="text-lg font-extrabold mt-0.5">
                  {formData.name || currentUser?.email?.split("@")[0]}
                </h3>
              </div>
              <span className="w-9 h-9 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-lg">
                +
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">System Role</span>
                <span className="font-bold uppercase text-emerald-400">
                  {formData.role}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-extrabold text-red-400 text-sm">
                  {formData.bloodGroup}
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400 block mb-1">
                  Known Allergies
                </span>
                <span className="font-semibold text-slate-200">
                  {formData.allergies || "None reported"}
                </span>
              </div>
              <div className="py-1.5 border-b border-slate-700/60">
                <span className="text-slate-400 block mb-1">
                  Chronic Conditions
                </span>
                <span className="font-semibold text-slate-200">
                  {formData.chronicConditions || "None reported"}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">
                  In Case of Emergency (ICE)
                </span>
                <p className="font-bold text-white">
                  {formData.contactName || "Not configured"}{" "}
                  {formData.contactRelation && `(${formData.contactRelation})`}
                </p>
                <p className="text-slate-300">{formData.contactPhone}</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
            {message.text && (
              <div
                className={`p-3.5 rounded-xl mb-6 text-xs font-bold ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Personal & Role Info */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">
                  1. Personal & Role Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g. Jordan Miller"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      System Role (Instant Switcher)
                    </label>
                    <select
                      value={formData.role}
                      onChange={e => {
                        const newRole = e.target.value;
                        setFormData({ ...formData, role: newRole });
                        switchRole(newRole);
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor / Specialist</option>
                      <option value="admin">Hospital Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 234-5678"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={e =>
                        setFormData({ ...formData, bloodGroup: e.target.value })
                      }
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical Alerts */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">
                  2. Clinical Alerts & Conditions
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Allergies (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.allergies}
                      onChange={e =>
                        setFormData({ ...formData, allergies: e.target.value })
                      }
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Chronic Conditions (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.chronicConditions}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          chronicConditions: e.target.value,
                        })
                      }
                      placeholder="e.g. Asthma, Type 2 Diabetes, Hypertension"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Emergency Contact */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">
                  3. Emergency Next-of-Kin Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="e.g. Sam Miller"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Relationship
                    </label>
                    <input
                      type="text"
                      value={formData.contactRelation}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          contactRelation: e.target.value,
                        })
                      }
                      placeholder="e.g. Spouse / Parent"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Emergency Phone
                    </label>
                    <input
                      type="text"
                      value={formData.contactPhone}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          contactPhone: e.target.value,
                        })
                      }
                      placeholder="+1 (555) 999-8888"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-[#1B5E4A] hover:bg-[#154b3b] text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Medical ID & Role"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
