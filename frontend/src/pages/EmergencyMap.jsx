import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../context/AuthContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const hospitalIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function EmergencyMap() {
  const { currentUser } = useAuth();
  const [userLocation, setUserLocation] = useState({
    lat: 23.8103,
    lng: 90.4125,
  });
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // SOS & Dispatch State
  const [activeDispatch, setActiveDispatch] = useState(null);
  const [requestingSOS, setRequestingSOS] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [emergencyNote, setEmergencyNote] = useState(
    "Severe clinical distress / Immediate extraction needed.",
  );

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineRef = useRef(null);

  const fetchHospitals = useCallback(async (lat, lng) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/maps/nearby?lat=${lat}&lng=${lng}`,
      );
      const data = res.data.hospitals || res.data;
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch nearby hospitals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkActiveSOS = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.get(
        "http://localhost:5000/api/dispatch/my-active",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setActiveDispatch(res.data.dispatch);
    } catch (err) {
      console.error("Active SOS check error:", err);
    }
  }, [currentUser]);

  // 1. Initial Load of Geolocation, Hospitals, and Active SOS
  useEffect(() => {
    let isMounted = true;

    const initMapData = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            if (!isMounted) return;
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            fetchHospitals(loc.lat, loc.lng);
          },
          () => {
            if (isMounted) fetchHospitals(23.8103, 90.4125);
          },
        );
      } else {
        await fetchHospitals(23.8103, 90.4125);
      }

      if (isMounted) {
        await checkActiveSOS();
      }
    };

    initMapData();

    return () => {
      isMounted = false;
    };
  }, [fetchHospitals, checkActiveSOS]);

  // 2. Connect to Real-Time Socket.io Server
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("hospital_updated", () => {
      fetchHospitals(userLocation.lat, userLocation.lng);
    });

    socket.on("dispatch_updated", () => {
      checkActiveSOS();
    });

    return () => {
      socket.disconnect();
    };
  }, [userLocation.lat, userLocation.lng, fetchHospitals, checkActiveSOS]);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      [userLocation.lat, userLocation.lng],
      13,
    );
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>You Are Here</b>")
      .openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation]);

  // 4. Selection & Route Line
  const handleSelectHospital = useCallback(
    hospital => {
      setSelectedHospital(hospital);
      const map = mapInstanceRef.current;
      if (!map || hospital.lat == null || hospital.lng == null) return;

      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
      }

      const latlngs = [
        [Number(userLocation.lat), Number(userLocation.lng)],
        [Number(hospital.lat), Number(hospital.lng)],
      ];

      const polyline = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 5,
        dashArray: "8, 8",
        opacity: 0.85,
      }).addTo(map);

      routePolylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    },
    [userLocation],
  );

  // 5. Render Hospital Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !Array.isArray(hospitals) || hospitals.length === 0) return;

    const markerGroup = L.layerGroup().addTo(map);

    hospitals.forEach(h => {
      const lat = Number(h.lat);
      const lng = Number(h.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: hospitalIcon }).addTo(
        markerGroup,
      );

      marker.bindPopup(`
        <div style="font-family: inherit;">
          <h4 style="font-weight: 700; margin: 0 0 4px 0;">${h.name || "Hospital"}</h4>
          <p style="margin: 0; font-size: 12px; color: #475569;">Beds: <b>${
            h.erBedsAvailable ?? "N/A"
          }</b></p>
          <p style="margin: 0; font-size: 12px; color: #dc2626;">ETA: <b>${
            h.eta ?? "N/A"
          }</b></p>
        </div>
      `);

      marker.on("click", () => handleSelectHospital(h));
    });

    return () => {
      markerGroup.clearLayers();
      map.removeLayer(markerGroup);
    };
  }, [hospitals, handleSelectHospital]);

  // 6. Transmit Emergency SOS
  const handleConfirmSOS = async () => {
    setRequestingSOS(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await axios.post(
        "http://localhost:5000/api/dispatch/sos",
        {
          lat: userLocation.lat,
          lng: userLocation.lng,
          emergencyNote,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setActiveDispatch(res.data.dispatch);
      setSosModalOpen(false);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to trigger emergency SOS dispatch.",
      );
    } finally {
      setRequestingSOS(false);
    }
  };

  const handleCancelSOS = async () => {
    if (!activeDispatch) return;
    if (!window.confirm("Cancel this active ambulance request?")) return;
    try {
      const token = await currentUser.getIdToken();
      await axios.patch(
        `http://localhost:5000/api/dispatch/${activeDispatch._id}/resolve`,
        { status: "cancelled" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setActiveDispatch(null);
    } catch {
      alert("Failed to cancel dispatch.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header & SOS Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/dashboard"
              className="text-blue-600 hover:underline text-sm font-semibold"
            >
              &larr; Back to Dashboard
            </Link>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                socketConnected
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected
                    ? "bg-emerald-600 animate-ping"
                    : "bg-slate-400"
                }`}
              />
              {socketConnected ? "Live WebSocket Sync" : "Connecting..."}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">
            Emergency Routing & Ambulance Dispatch
          </h1>
          <p className="text-slate-600 text-sm">
            Locate nearest ERs with real-time bed counts or request immediate
            ambulance extraction.
          </p>
        </div>

        <button
          onClick={() => setSosModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-red-200 transition cursor-pointer"
        >
          <span className="w-3 h-3 rounded-full bg-white animate-ping"></span>
          Request Ambulance (SOS)
        </button>
      </div>

      {/* Active Live Dispatch Status Banner */}
      {activeDispatch && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white/20 tracking-wider">
                Status: {activeDispatch.status}
              </span>
              <span className="text-xs font-semibold text-red-100">
                Unit:{" "}
                {activeDispatch.ambulanceUnit ||
                  "Assigning response vehicle..."}
              </span>
            </div>
            <h3 className="text-lg font-bold">
              Ambulance Response — ETA: {activeDispatch.eta}
            </h3>
            {activeDispatch.driverContact && (
              <p className="text-xs text-red-100 mt-0.5">
                Driver Contact: <b>{activeDispatch.driverContact}</b>
              </p>
            )}
          </div>
          <button
            onClick={handleCancelSOS}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancel Request
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div ref={mapContainerRef} className="w-full h-[550px] z-0" />
        </div>

        {/* Hospital Directory List */}
        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
          {loading ? (
            <p className="text-slate-500">Scanning for nearest hospitals...</p>
          ) : (
            hospitals.map(hospital => {
              const isSelected = selectedHospital?.id === hospital.id;
              return (
                <div
                  key={hospital.id}
                  onClick={() => handleSelectHospital(hospital)}
                  className={`p-5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-base">
                      {hospital.name}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {hospital.distance}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 my-3">
                    <div>
                      <span className="block text-slate-400">ETA</span>
                      <span className="font-bold text-red-600 text-sm">
                        {hospital.eta}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">
                        Available Beds
                      </span>
                      <span className="font-bold text-emerald-600 text-sm">
                        {hospital.erBedsAvailable}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${hospital.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-center bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition"
                    >
                      Call Hospital
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-3 rounded-lg text-xs transition"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SOS Modal Dialog */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border-4 border-red-500">
            <div className="text-center mb-6">
              <span className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-black text-2xl mx-auto mb-3">
                SOS
              </span>
              <h2 className="text-2xl font-black text-slate-800">
                Dispatch Emergency Ambulance
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your live coordinates ({userLocation.lat.toFixed(4)},{" "}
                {userLocation.lng.toFixed(4)}) and registered Medical ID will be
                transmitted immediately via WebSocket.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Emergency Notes / Immediate Symptoms
              </label>
              <textarea
                rows="3"
                value={emergencyNote}
                onChange={e => setEmergencyNote(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSosModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmSOS}
                disabled={requestingSOS}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-red-200 disabled:bg-red-300 cursor-pointer"
              >
                {requestingSOS ? "Broadcasting SOS..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
