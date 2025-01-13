const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Path to Devices.json
const devicesFilePath = './public/Devices.json';

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
app.delete('/devices', (req, res) => {
  const { deviceId } = req.body;
  fs.readFile(devicesFilePath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading devices file');
    } else {
      const devicesData = JSON.parse(data);
      devicesData.devices = devicesData.devices.filter((device) => !device.startsWith(deviceId));
      fs.writeFile(devicesFilePath, JSON.stringify(devicesData, null, 2), (writeErr) => {
        if (writeErr) {
          res.status(500).send('Error writing to devices file');
        } else {
          res.status(200).send('Device removed successfully');
        }
      });
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
