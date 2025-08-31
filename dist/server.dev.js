"use strict";

var express = require("express");

var cors = require("cors");

var multer = require("multer");

var fs = require("fs");

var csv = require("fast-csv");

var path = require("path");

var app = express();
app.use(cors());
app.use(express.json());
var uploadsFolder = path.join(__dirname, "uploads"); // Ensure "uploads" folder exists

if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder);
} // Multer file upload configuration


var storage = multer.diskStorage({
  destination: uploadsFolder,
  filename: function filename(req, file, cb) {
    cb(null, file.originalname);
  }
});
var upload = multer({
  storage: storage
}); // 📌 Upload CSV Endpoint

app.post("/upload", upload.single("file"), function (req, res) {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded."
    });
  }

  res.json({
    message: "File uploaded successfully!",
    file: req.file.filename
  });
}); // 📌 Function to Parse Custom Date Format "M/D ddd" → YYYY-MM-DD

var parseCustomDate = function parseCustomDate(dateStr) {
  if (!dateStr) return null; // Extract "M/D" part from "M/D ddd" format

  var match = dateStr.match(/^(\d{1,2}\/\d{1,2})/);
  if (!match) return null;
  var currentYear = new Date().getFullYear(); // Use current year

  var formattedDateStr = "".concat(match[1], "/").concat(currentYear); // Convert to MM/DD/YYYY

  var parsedDate = new Date(formattedDateStr);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}; // 📌 Fetch Driver Trips with Filtering


app.get("/trips", function (req, res) {
  var _req$query = req.query,
      driverName = _req$query.driverName,
      startDate = _req$query.startDate,
      endDate = _req$query.endDate,
      status = _req$query.status;
  var trips = [];
  var filesProcessed = 0;
  var start = startDate ? new Date(startDate) : null;
  var end = endDate ? new Date(endDate) : null;
  var files = fs.readdirSync(uploadsFolder).filter(function (file) {
    return file.endsWith(".csv");
  });

  if (files.length === 0) {
    return res.status(404).json({
      message: "No trip data available."
    });
  }

  files.forEach(function (file) {
    fs.createReadStream(path.join(uploadsFolder, file)).pipe(csv.parse({
      headers: true
    })).on("headers", function (headers) {
      console.log("CSV Headers Detected:", headers);
    }).on("data", function (row) {
      // Check if "Driver Name" column exists
      if (!row["Driver Name"]) {
        console.error("CSV file is missing 'Driver Name' column. Skipping row:", row);
        return;
      } // Convert CSV date format "M/D ddd" → Valid Date Object


      var tripDate = parseCustomDate(row.Date);

      if ((!driverName || row["Driver Name"].toLowerCase().includes(driverName.toLowerCase())) && (!start || tripDate && tripDate >= start) && (!end || tripDate && tripDate <= end) && (!status || row.Status.toLowerCase() === status.toLowerCase())) {
        trips.push(row);
      }
    }).on("error", function (error) {
      console.error("CSV Parsing Error:", error.message);
      res.status(500).json({
        message: "Error processing CSV file"
      });
    }).on("end", function () {
      filesProcessed++;

      if (filesProcessed === files.length) {
        res.json(trips);
      }
    });
  });
}); // 📌 Start the Server

var PORT = process.env.PORT || 5001;
app.listen(PORT, function () {
  return console.log("\uD83D\uDE80 Server running on port ".concat(PORT));
});