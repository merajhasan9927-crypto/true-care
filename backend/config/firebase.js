import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";

try {
  // Check if the service account file exists before trying to read it
  if (fs.existsSync("./firebase-service-account.json")) {
    const serviceAccount = JSON.parse(
      fs.readFileSync("./firebase-service-account.json", "utf-8"),
    );

    // Prevent initializing multiple times
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    }
  } else {
    console.warn(
      "⚠️ WARNING: firebase-service-account.json is missing. Protected routes will fail.",
    );
  }
} catch (error) {
  console.error("Firebase initialization error:", error.message);
}

// Export the auth module using the modular getAuth() function
export const auth = getApps().length > 0 ? getAuth() : null;
