import Hospital from "../models/Hospital.js";

// Haversine formula to compute distance in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// GET /api/maps/nearby?lat=...&lng=...
export const getNearbyHospitals = async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat) || 23.8103;
    const userLng = parseFloat(req.query.lng) || 90.4125;

    // 1. Check if database has hospital entries; if not, seed them
    let hospitals = await Hospital.find({});

    if (hospitals.length === 0) {
      hospitals = await Hospital.insertMany([
        {
          name: "City Central Emergency Hospital",
          lat: userLat + 0.008,
          lng: userLng + 0.007,
          phone: "+1 (555) 019-2834",
          erBedsAvailable: 8,
          status: "Open 24/7",
        },
        {
          name: "Metro Trauma & Surgical Center",
          lat: userLat - 0.012,
          lng: userLng + 0.009,
          phone: "+1 (555) 014-9988",
          erBedsAvailable: 3,
          status: "Critical Alert: Limited Beds",
        },
        {
          name: "Saint Jude Memorial Clinic",
          lat: userLat + 0.015,
          lng: userLng - 0.006,
          phone: "+1 (555) 017-5421",
          erBedsAvailable: 14,
          status: "Open 24/7",
        },
      ]);
    }

    // 2. Format with dynamic distance and estimated travel times
    const formatted = hospitals.map(h => {
      const dist = calculateDistanceKm(userLat, userLng, h.lat, h.lng);
      const roundedDist = dist.toFixed(1);
      // Rough emergency driving estimate: 3 mins per km + 2 min buffer
      const etaMinutes = Math.max(3, Math.round(dist * 3.2));

      return {
        id: h._id.toString(),
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        phone: h.phone,
        erBedsAvailable: h.erBedsAvailable,
        status: h.status,
        distance: `${roundedDist} km`,
        eta: `${etaMinutes} mins`,
      };
    });

    // 3. Sort by nearest distance
    formatted.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    res.status(200).json({ hospitals: formatted });
  } catch (error) {
    console.error("Maps Nearby Error:", error);
    res.status(500).json({ message: "Failed to fetch nearby hospitals" });
  }
};
