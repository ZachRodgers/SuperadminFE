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

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
