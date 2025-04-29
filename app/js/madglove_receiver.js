const DEVICE_CONFIGS = [
    { namePrefix: "MadGloveSense-1", label: "Device 1" },
    { namePrefix: "MadGloveSense-2", label: "Device 2" },
    { namePrefix: "MadGloveSense-3", label: "Device 3" },
  ];
  
  const devices = {};
  
  window.addEventListener("DOMContentLoaded", () => {
    const main = document.getElementById("main-content");
  
    DEVICE_CONFIGS.forEach((config, index) => {
      const container = document.createElement("div");
      container.className = "col-md-6";
      container.innerHTML = `
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>${config.label}</span>
            <button id="connect-btn-${index}" class="btn btn-sm btn-primary">Connect</button>
          </div>
          <div class="card-body">
            <pre id="imuDisplay-${index}" class="mb-0" style="font-family: monospace; white-space: pre-wrap;">Not connected</pre>
          </div>
        </div>
      `;
      main.appendChild(container);
  
      document
        .getElementById(`connect-btn-${index}`)
        .addEventListener("click", () => connectMadGlove(index, config));
    });
  });
  
  async function connectMadGlove(index, config) {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: config.namePrefix }],
        optionalServices: ["19b10000-e8f2-537e-4f6c-d104768a1214"],
      });
  
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("19b10000-e8f2-537e-4f6c-d104768a1214");
  
      const controlChar = await service.getCharacteristic("19b10001-e8f2-537e-4f6c-d104768a1214");
      const imuChar = await service.getCharacteristic("19b10002-e8f2-537e-4f6c-d104768a1214");
  
      await imuChar.startNotifications();
      imuChar.addEventListener("characteristicvaluechanged", (event) => {
        handleIMUData(event, index);
      });
  
      await controlChar.writeValue(Uint8Array.of(10)); // Start IMU
  
      devices[index] = {
        device,
        server,
        imuChar,
        controlChar,
      };
  
      updateIMUDisplay(index, { status: "Connected, waiting for data..." });
      console.log(`${config.label} connected`);
    } catch (error) {
      console.error(`Connection failed for ${config.label}`, error);
      updateIMUDisplay(index, { status: "Connection failed." });
    }
  }
  
  function handleIMUData(event, index) {
    const data = event.target.value;
    const view = new DataView(data.buffer);
  
    const imu = {
      ax: view.getFloat32(0, true),
      ay: view.getFloat32(4, true),
      az: view.getFloat32(8, true),
      gx: view.getFloat32(12, true),
      gy: view.getFloat32(16, true),
      gz: view.getFloat32(20, true),
      temp: view.getFloat32(24, true),
      batteryVoltage: view.getFloat32(28, true),
      batteryPercent: view.getFloat32(32, true),
    };
  
    updateIMUDisplay(index, imu);
  }
  
  function updateIMUDisplay(index, data) {
    const el = document.getElementById(`imuDisplay-${index}`);
    if (!el) return;
  
    if (data.status) {
      el.textContent = data.status;
      return;
    }
  
    el.textContent = `
  Accelerometer:
    X: ${data.ax?.toFixed?.(2) ?? "--"}
    Y: ${data.ay?.toFixed?.(2) ?? "--"}
    Z: ${data.az?.toFixed?.(2) ?? "--"}
  
  Gyroscope:
    X: ${data.gx?.toFixed?.(2) ?? "--"}
    Y: ${data.gy?.toFixed?.(2) ?? "--"}
    Z: ${data.gz?.toFixed?.(2) ?? "--"}
  
  Temperature:
    ${data.temp?.toFixed?.(2) ?? "--"} °C
  
  Battery:
    ${data.batteryVoltage?.toFixed?.(2) ?? "--"} V
    ${data.batteryPercent?.toFixed?.(0) ?? "--"}%
  `.trim();
  }
  