/**
 * Multi‐device Web Bluetooth client for up to 5 MadGloveSense units.
 * Generates one row per slot in <main>, each with its own Connect/Disconnect
 * button and live IMU+battery readout.
 */

const MAX_DEVICES       = 5;
const DEVICE_NAME_PREFIX = "MadGloveSense";
const SERVICE_UUID       = "19b10000-e8f2-537e-4f6c-d104768a1214";
const IMU_CHAR_UUID      = "19b10002-e8f2-537e-4f6c-d104768a1214";

// Holds state for each slot
const slots = Array.from({ length: MAX_DEVICES }, () => ({
  device: null,
  char:   null
}));

window.addEventListener("DOMContentLoaded", () => {
  const main = document.querySelector("main");
  if (!main) {
    console.error("No <main> element found");
    return;
  }

  // Create UI rows
  for (let i = 0; i < MAX_DEVICES; i++) {
    const row = document.createElement("div");
    row.className = "d-flex align-items-start mb-3";
    row.innerHTML = `
      <button id="btn-${i}" class="btn btn-sm btn-primary me-2">
        Connect
      </button>
      <div class="flex-fill">
        <strong>Device ${i+1}:</strong>
        <pre id="out-${i}" style="font-family:monospace; white-space:pre-wrap;
           margin:4px 0; padding:4px; border:1px solid #ccc;">Not connected</pre>
      </div>
    `;
    main.appendChild(row);

    // Wire up button
    document.getElementById(`btn-${i}`)
      .addEventListener("click", () => handleButtonClick(i));
  }
});

async function handleButtonClick(index) {
  const slot = slots[index];
  const btn  = document.getElementById(`btn-${index}`);
  const out  = document.getElementById(`out-${index}`);

  // If already connected, disconnect
  if (slot.device && slot.device.gatt.connected) {
    slot.device.gatt.disconnect();
    return;
  }

  // Otherwise, start a new connection
  try {
    out.textContent = "Requesting device...";
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
      optionalServices: [SERVICE_UUID]
    });
    slot.device = device;
    device.addEventListener("gattserverdisconnected", () => onDisconnected(index));

    out.textContent = "Connecting GATT...";
    const server = await device.gatt.connect();

    out.textContent = "Getting IMU service...";
    const service = await server.getPrimaryService(SERVICE_UUID);

    out.textContent = "Getting IMU characteristic...";
    const char = await service.getCharacteristic(IMU_CHAR_UUID);
    slot.char = char;

    out.textContent = "Subscribing to notifications...";
    await char.startNotifications();
    char.addEventListener("characteristicvaluechanged",
                          e => onIMUData(e, index));

    btn.textContent = "Disconnect";
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-danger");
    out.textContent = "Connected — waiting for data...";
  } catch (err) {
    console.error(err);
    out.textContent = "Error: " + err.message;
  }
}

function onDisconnected(index) {
  const slot = slots[index];
  const btn  = document.getElementById(`btn-${index}`);
  const out  = document.getElementById(`out-${index}`);

  slot.device = null;
  slot.char   = null;
  btn.textContent = "Connect";
  btn.classList.remove("btn-danger");
  btn.classList.add("btn-primary");
  out.textContent = "Disconnected — Low-Power IMU resumed";
}

function onIMUData(event, index) {
  const view = event.target.value;
  // 9 floats: ax,ay,az,gx,gy,gz,temp,voltage,percent
  const f = [];
  for (let i = 0; i < 9; i++) {
    f.push(view.getFloat32(i * 4, /* littleEndian */ true));
  }
  const [ax, ay, az, gx, gy, gz, temp, voltage, percent] = f;

  const out = document.getElementById(`out-${index}`);
  out.textContent = `
Accelerometer (g):  X:${ax.toFixed(2)}  Y:${ay.toFixed(2)}  Z:${az.toFixed(2)}
Gyroscope (°/s):    X:${gx.toFixed(1)}  Y:${gy.toFixed(1)}  Z:${gz.toFixed(1)}
Temperature:        ${temp.toFixed(1)} °C
Battery:            ${voltage.toFixed(2)} V (${percent.toFixed(0)} %)
  `.trim();
  updateCharts(index, { ax, ay, az, gx, gy, gz });
}
