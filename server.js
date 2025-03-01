const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Paths to JSON files
const devicesFilePath = './public/Devices.json';
const lotsFilePath = './src/data/Lots.json';
const vehicleLogFilePath = './src/data/VehicleLog.json';

// ** Devices.json Endpoints ** //

// Read Devices
app.get('/devices', (req, res) => {
  fs.readFile(devicesFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading devices file');
    } else {
      res.json(JSON.parse(data));
    }
  });
});

// Add Device
app.post('/devices', (req, res) => {
  const { newDevice } = req.body;
  fs.readFile(devicesFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading devices file');
    } else {
      const devicesData = JSON.parse(data);
      devicesData.devices.push(newDevice);
      fs.writeFile(devicesFilePath, JSON.stringify(devicesData, null, 2), (writeErr) => {
        if (writeErr) {
          res.status(500).send('Error writing to devices file');
        } else {
          res.status(200).send('Device added successfully');
        }
      });
    }
  });
});

// Remove Device
app.delete('/devices/:deviceID', (req, res) => {
  const { deviceID } = req.params;
  fs.readFile(devicesFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading devices file');
      return;
    }

    const devicesData = JSON.parse(data);

    devicesData.devices = devicesData.devices.filter((device) => {
      const parsedId = device.match(/deviceID:([^;]+)/)?.[1];
      return parsedId !== deviceID;
    });

    fs.writeFile(devicesFilePath, JSON.stringify(devicesData, null, 2), (writeErr) => {
      if (writeErr) {
        res.status(500).send('Error writing to devices file');
      } else {
        res.status(200).send(`Device with ID ${deviceID} removed successfully.`);
      }
    });
  });
});

// ** Lots.json Endpoints ** //

// Update Lots
app.put('/update-lots', (req, res) => {
  const updatedLots = req.body;

  if (!Array.isArray(updatedLots)) {
    res.status(400).send('Invalid data format. Expected an array.');
    return;
  }

  fs.writeFile(lotsFilePath, JSON.stringify(updatedLots, null, 2), (err) => {
    if (err) {
      console.error('Error updating Lots.json:', err);
      res.status(500).send('Failed to update Lots.json.');
    } else {
      console.log('Lots.json successfully updated.');
      res.status(200).send('Lots.json updated successfully.');
    }
  });
});

// ** VehicleLog Endpoints ** //

// Read Vehicle Log (transforms new schema -> old shape)
app.get('/vehicle-log', (req, res) => {
  fs.readFile(vehicleLogFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading vehicle log file');
    }
    try {
      const rawLog = JSON.parse(data); // new schema
      // Convert each to old shape for the frontend:
      const transformedLog = rawLog.map(entry => ({
        lotID: entry.lotID,
        plate: entry.plateNumber,
        timestamp: entry.timestamp,
        state: entry.status, 
        // We'll assume your UI uses placeholder if empty:
        imagename: entry.imageURL === '' ? 'placeholder' : entry.imageURL,
        confidence: entry.confidence
      }));
      res.json(transformedLog);
    } catch (parseErr) {
      res.status(500).send('Error parsing vehicle log data');
    }
  });
});

// Add new ALPR entry to VehicleLog.json (old shape -> new schema)
app.post('/vehicle-log', (req, res) => {
  const { plate, timestamp, state, confidence, lotID } = req.body;

  if (!plate || !timestamp || !state || !confidence || !lotID) {
    return res.status(400).send('Missing required fields');
  }

  fs.readFile(vehicleLogFilePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading vehicle log file');
    }

    let vehicleLog = [];
    try {
      vehicleLog = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).send('Error parsing vehicle log file');
    }

    // Build new entry in the NEW schema
    const newEntry = {
      deviceID: "",
      plateNumber: plate,   // from the UI
      imageURL: "",        // blank -> placeholder in UI
      timestamp,           // from the UI
      lotID,               // from the UI
      confidence,          // from the UI
      status: state,       // "Enter"/"Exit"
      vehicleType: "",
      vehicleMake: "",
      vehicleModel: "",
      deviceTemp: ""
    };

    vehicleLog.push(newEntry);

    fs.writeFile(vehicleLogFilePath, JSON.stringify(vehicleLog, null, 2), (writeErr) => {
      if (writeErr) {
        return res.status(500).send('Error writing to vehicle log file');
      }
      res.status(200).send('Entry added successfully');
    });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
