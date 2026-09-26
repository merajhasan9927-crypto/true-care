/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with Email & Password
  const signup = async (email, password, additionalData = {}) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const chosenRole = additionalData.role || "patient";
    localStorage.setItem(`truecare_role_${cred.user.uid}`, chosenRole);

    try {
      const token = await cred.user.getIdToken();
      const res = await axios.put(
        "http://localhost:5000/api/auth/profile",
        {
          name: additionalData.name || "",
          role: chosenRole,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setDbUser(res.data.user);
    } catch (e) {
      console.warn("Could not sync profile to DB:", e.message);
      setDbUser({
        uid: cred.user.uid,
        email: cred.user.email,
        name:
          additionalData.name || cred.user.email?.split("@")[0] || "Patient",
        role: chosenRole,
      });
    }
    return cred;
  };

  // Sign in
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Google sign in
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // Instant Role Switcher (Updates React State, localStorage, and MongoDB without reload)
  const switchRole = async newRole => {
    if (!currentUser) return;
    localStorage.setItem(`truecare_role_${currentUser.uid}`, newRole);

    setDbUser(prev => ({
      ...(prev || {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.email?.split("@")[0] || "User",
      }),
      role: newRole,
    }));

    try {
      const token = await currentUser.getIdToken();
      const res = await axios.put(
        "http://localhost:5000/api/auth/profile",
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data?.user) {
        setDbUser({ ...res.data.user, role: newRole });
      }
    } catch (err) {
      console.warn("Role saved locally; backend sync note:", err.message);
    }
  };

  // Logout
  const logout = () => {
    setDbUser(null);
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);

      if (user) {
        const savedLocalRole = localStorage.getItem(
          `truecare_role_${user.uid}`,
        );
        try {
          const token = await user.getIdToken();
          const res = await axios.get(
            "http://localhost:5000/api/auth/profile",
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const fetchedUser = res.data.user || {};
          const effectiveRole = savedLocalRole || fetchedUser.role || "patient";

          // Keep backend in sync if localStorage had an updated role
          if (savedLocalRole && fetchedUser.role !== savedLocalRole) {
            axios
              .put(
                "http://localhost:5000/api/auth/profile",
                { role: savedLocalRole },
                { headers: { Authorization: `Bearer ${token}` } },
              )
              .catch(() => {});
          }

          setDbUser({
            ...fetchedUser,
            email: fetchedUser.email || user.email,
            name:
              fetchedUser.name ||
              user.displayName ||
              user.email?.split("@")[0] ||
              "Patient",
            role: effectiveRole,
          });
        } catch {
          setDbUser({
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email?.split("@")[0] || "Patient",
            role: savedLocalRole || "patient",
          });
        }
      } else {
        setDbUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    dbUser,
    setDbUser,
    switchRole,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      currentUser: null,
      dbUser: null,
      setDbUser: () => {},
      switchRole: async () => {},
      loading: false,
      login: async () => {},
      signup: async () => {},
      logout: async () => {},
      loginWithGoogle: async () => {},
    };
  }
  return context;
};

export default AuthProvider;
