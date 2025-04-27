// app/js/ble-connection.js
(() => {
    'use strict';
  
    // Must be lowercase!
    const SERVICE_UUID        = '19b10000-e8f2-537e-4f6c-d104768a1214';
    const CHARACTERISTIC_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
  
    let device = null;
    let characteristic = null;
  
    // Grab UI container
    const container = document.getElementById('main-content');
  
    // Create status div
    const statusDiv = document.createElement('div');
    statusDiv.id = 'ble-status';
    statusDiv.className = 'col-12 mt-2';
    container.appendChild(statusDiv);
  
    // Create buttons
    const btnConnect = document.createElement('button');
    btnConnect.id = 'btn-connect';
    btnConnect.className = 'btn btn-primary';
    btnConnect.textContent = 'Connect to LED Peripheral';
  
    const btnOn = document.createElement('button');
    btnOn.id = 'btn-on';
    btnOn.className = 'btn btn-success';
    btnOn.textContent = 'Turn On';
    btnOn.disabled = true;
  
    const btnOff = document.createElement('button');
    btnOff.id = 'btn-off';
    btnOff.className = 'btn btn-danger';
    btnOff.textContent = 'Turn Off';
    btnOff.disabled = true;
  
    // Layout buttons
    const row1 = document.createElement('div');
    row1.className = 'col-12 mb-2';
    row1.appendChild(btnConnect);
  
    const row2 = document.createElement('div');
    row2.className = 'col-6';
    row2.appendChild(btnOn);
  
    const row3 = document.createElement('div');
    row3.className = 'col-6';
    row3.appendChild(btnOff);
  
    container.insertBefore(row1, statusDiv);
    container.insertBefore(row2, statusDiv);
    container.insertBefore(row3, statusDiv);
  
    function log(msg) {
      statusDiv.textContent = msg;
    }
  
    // Connect to the BLE device and cache characteristic
    async function connect() {
      try {
        log('Requesting Bluetooth device...');
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [SERVICE_UUID] }],
          optionalServices: [SERVICE_UUID]
        });
  
        device.addEventListener('gattserverdisconnected', onDisconnected);
  
        log('Connecting to GATT server...');
        const server = await device.gatt.connect();
  
        log('Getting LED service...');
        const service = await server.getPrimaryService(SERVICE_UUID);
  
        log('Getting LED characteristic...');
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
  
        log('✅ Connected!');
        btnOn.disabled = false;
        btnOff.disabled = false;
        btnConnect.disabled = true;
  
      } catch (error) {
        console.error(error);
        log(`❌ ${error}`);
      }
    }
  
    // Handle disconnection
    function onDisconnected() {
      log('⚠️ Disconnected');
      btnOn.disabled = true;
      btnOff.disabled = true;
      btnConnect.disabled = false;
      characteristic = null;
      device = null;
    }
  
    // Write value to LED characteristic
    async function writeLED(value) {
      if (!characteristic) {
        log('Not connected');
        return;
      }
      try {
        await characteristic.writeValue(Uint8Array.of(value));
        log(value ? 'LED ON' : 'LED OFF');
      } catch (error) {
        console.error(error);
        log(`Write error: ${error}`);
      }
    }
  
    // Button event listeners
    btnConnect.addEventListener('click', connect);
    btnOn.addEventListener('click',  () => writeLED(1));
    btnOff.addEventListener('click', () => writeLED(0));
  
    // Feature detect
    if (!navigator.bluetooth) {
      log('Web Bluetooth API not supported in this browser.');
      btnConnect.disabled = true;
    }
  })();
  