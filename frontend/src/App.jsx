import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AiDiagnosis from "./pages/AiDiagnosis";
import EmergencyMap from "./pages/EmergencyMap";
import Appointments from "./pages/Appointments";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import MedicalRecords from "./pages/MedicalRecords";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Auth />} />

              {/* Protected Patient & Clinical Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diagnosis"
                element={
                  <ProtectedRoute>
                    <AiDiagnosis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/emergency-map"
                element={
                  <ProtectedRoute>
                    <EmergencyMap />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/appointments"
                element={
                  <ProtectedRoute>
                    <Appointments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/records"
                element={
                  <ProtectedRoute>
                    <MedicalRecords />
                  </ProtectedRoute>
                }
              />

              {/* Role-Protected Staff Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin", "doctor"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
