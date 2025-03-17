const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const csv = require("fast-csv");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const uploadsFolder = path.join(__dirname, "uploads");

// Ensure "uploads" folder exists
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
}

// Multer file upload configuration
const storage = multer.diskStorage({
  destination: uploadsFolder,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// 📌 Upload CSV Endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }
  res.json({ message: "File uploaded successfully!", file: req.file.filename });
});

// 📌 Function to Parse Custom Date Format "M/D ddd" → YYYY-MM-DD
const parseCustomDate = (dateStr) => {
    if (!dateStr) return null;

    // Extract "M/D" part from "M/D ddd" format
    const match = dateStr.match(/^(\d{1,2}\/\d{1,2})/);
    if (!match) return null;

    const currentYear = new Date().getFullYear(); // Use current year
    const formattedDateStr = `${match[1]}/${currentYear}`; // Convert to MM/DD/YYYY

    const parsedDate = new Date(formattedDateStr);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// 📌 Fetch Driver Trips with Filtering
app.get("/trips", (req, res) => {
    const { driverName, startDate, endDate, status } = req.query;
    let trips = [];
    let filesProcessed = 0;

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const files = fs.readdirSync(uploadsFolder).filter(file => file.endsWith(".csv"));
    if (files.length === 0) {
        return res.status(404).json({ message: "No trip data available." });
    }

    files.forEach((file) => {
        fs.createReadStream(path.join(uploadsFolder, file))
            .pipe(csv.parse({ headers: true }))
            .on("headers", (headers) => {
                console.log("CSV Headers Detected:", headers);
            })
            .on("data", (row) => {
                // Check if "Driver Name" column exists
                if (!row["Driver Name"]) {
                    console.error("CSV file is missing 'Driver Name' column. Skipping row:", row);
                    return;
                }

                // Convert CSV date format "M/D ddd" → Valid Date Object
                const tripDate = parseCustomDate(row.Date);

                if (
                    (!driverName || row["Driver Name"].toLowerCase().includes(driverName.toLowerCase())) &&
                    (!start || (tripDate && tripDate >= start)) &&
                    (!end || (tripDate && tripDate <= end)) &&
                    (!status || row.Status.toLowerCase() === status.toLowerCase())
                ) {
                    trips.push(row);
                }
            })
            .on("error", (error) => {
                console.error("CSV Parsing Error:", error.message);
                res.status(500).json({ message: "Error processing CSV file" });
            })
            .on("end", () => {
                filesProcessed++;
                if (filesProcessed === files.length) {
                    res.json(trips);
                }
            });
    });
});

// 📌 Start the Server
app.listen(5001, () =>
  console.log("🚀 Server running on http://localhost:5001")
);
