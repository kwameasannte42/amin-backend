// ✅ UPDATED SERVER.JS to use Supabase instead of reading CSV from filesystem

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Multer setup for CSV uploads (optional if you don’t need uploads anymore)
const uploadsFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
}
const storage = multer.diskStorage({
  destination: uploadsFolder,
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// (Optional) Upload Endpoint to save CSV file — does NOT insert to DB
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  res.json({ message: "File uploaded successfully!", file: req.file.filename });
});

// 📌 GET trips from Supabase with filters
app.get("/trips", async (req, res) => {
  const { driverName, startDate, endDate, status } = req.query;
  let query = supabase.from("trips").select("*");

  if (driverName) {
    query = query.ilike("driver_name", `%${driverName}%`);
  }
  if (startDate && endDate) {
    query = query.gte("trip_date", startDate).lte("trip_date", endDate);
  }
  if (status) {
    query = query.ilike("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("❌ Supabase fetch error:", error);
    return res.status(500).json({ message: "Error retrieving trips" });
  }

  const trips = Array.isArray(data) ? data : [];
  const totalMileage = trips.reduce((acc, t) => acc + (t.miles || 0), 0);
  const completedTrips = trips.filter(
    (t) => t.status?.toLowerCase() === "completed" || t.status?.toLowerCase() === "noshow"
  ).length;

  res.json({ trips, totalMileage, completedTrips });
});

// 📌 Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
