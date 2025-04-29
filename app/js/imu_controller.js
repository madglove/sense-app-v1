'use strict';

import { bleDevice } from './ble_manager.js'; // ← not bleCharacteristic anymore, we need device!

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('main-content');

  const imuButtonContainer = document.createElement('div');
  imuButtonContainer.className = 'd-flex flex-wrap gap-2 mt-3';
  container.appendChild(imuButtonContainer);

  const btnStartIMU = document.createElement('button');
  btnStartIMU.className = 'btn btn-info';
  btnStartIMU.textContent = 'Start IMU';
  btnStartIMU.disabled = true;

  const btnStopIMU = document.createElement('button');
  btnStopIMU.className = 'btn btn-warning';
  btnStopIMU.textContent = 'Stop IMU';
  btnStopIMU.disabled = true;

  imuButtonContainer.appendChild(btnStartIMU);
  imuButtonContainer.appendChild(btnStopIMU);

  const imuDataDiv = document.createElement('div');
  imuDataDiv.id = 'imu-data';
  imuDataDiv.className = 'mt-3';
  container.appendChild(imuDataDiv);

  let imuCharacteristic = null;

  // 👇 Check when BLE is connected
  const checkBLEReady = setInterval(async () => {
    if (bleDevice && bleDevice.gatt.connected) {
      clearInterval(checkBLEReady);
      console.log('BLE Device ready, connecting to IMU characteristic...');
      await connectToIMU();
    }
  }, 500);

  async function connectToIMU() {
    try {
      const service = await bleDevice.gatt.getPrimaryService('19b10000-e8f2-537e-4f6c-d104768a1214');
      imuCharacteristic = await service.getCharacteristic('19b10002-e8f2-537e-4f6c-d104768a1214');

      await imuCharacteristic.startNotifications();
      imuCharacteristic.addEventListener('characteristicvaluechanged', handleIMUData);

      btnStartIMU.disabled = false;
      btnStopIMU.disabled = false;
      console.log('✅ Subscribed to IMU data');
    } catch (error) {
      console.error('Error connecting to IMU data:', error);
    }
  }

  function handleIMUData(event) {
    const data = event.target.value;

    if (data.byteLength !== 28) {
      console.warn('Unexpected IMU data size');
      return;
    }

    // Parse floats
    const ax = data.getFloat32(0, true);
    const ay = data.getFloat32(4, true);
    const az = data.getFloat32(8, true);
    const gx = data.getFloat32(12, true);
    const gy = data.getFloat32(16, true);
    const gz = data.getFloat32(20, true);
    const temp = data.getFloat32(24, true);

    imuDataDiv.innerHTML = `
      <strong>IMU Data:</strong><br>
      Accel X: ${ax.toFixed(3)}<br>
      Accel Y: ${ay.toFixed(3)}<br>
      Accel Z: ${az.toFixed(3)}<br>
      Gyro X: ${gx.toFixed(3)}<br>
      Gyro Y: ${gy.toFixed(3)}<br>
      Gyro Z: ${gz.toFixed(3)}<br>
      Temp: ${temp.toFixed(2)} °C
    `;
  }

  // Send start/stop commands
  btnStartIMU.addEventListener('click', async () => {
    if (!bleDevice || !bleDevice.gatt.connected) return;
    const service = await bleDevice.gatt.getPrimaryService('19b10000-e8f2-537e-4f6c-d104768a1214');
    const controlChar = await service.getCharacteristic('19b10001-e8f2-537e-4f6c-d104768a1214');
    await controlChar.writeValue(Uint8Array.of(10)); // Start IMU
    console.log('IMU Start Command Sent');
  });

  btnStopIMU.addEventListener('click', async () => {
    if (!bleDevice || !bleDevice.gatt.connected) return;
    const service = await bleDevice.gatt.getPrimaryService('19b10000-e8f2-537e-4f6c-d104768a1214');
    const controlChar = await service.getCharacteristic('19b10001-e8f2-537e-4f6c-d104768a1214');
    await controlChar.writeValue(Uint8Array.of(11)); // Stop IMU
    console.log('IMU Stop Command Sent');
  });
});
