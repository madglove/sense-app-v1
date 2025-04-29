// app/js/ble_manager.js
'use strict';

export let bleDevice = null;
export let bleCharacteristic = null;

const SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const CHARACTERISTIC_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';

export async function connectBLE() {
  try {
    console.log('Requesting BLE device...');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });

    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    console.log('Connecting to GATT server...');
    const server = await bleDevice.gatt.connect();

    console.log('Getting primary service...');
    const service = await server.getPrimaryService(SERVICE_UUID);

    console.log('Getting characteristic...');
    bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    console.log('✅ BLE Connected');
  } catch (error) {
    console.error('❌ BLE Connection Error:', error);
  }
}

function onDisconnected() {
  console.warn('⚠️ BLE Disconnected');
  bleDevice = null;
  bleCharacteristic = null;
}
