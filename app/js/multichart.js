// multichart.js

// ── CONFIG ─────────────────────────────────────────────
const MAX_DEVICES = 5;
const WINDOW_MS   = 2000;   // show only last 2s of data
const GYRO_ALPHA  = 0.2;    // smoothing

// ── STATE ──────────────────────────────────────────────
const chartsAcc  = Array(MAX_DEVICES).fill(null);
const chartsGyro = Array(MAX_DEVICES).fill(null);
const gyroState  = Array.from({ length: MAX_DEVICES }, () => ({ gx:0, gy:0, gz:0, init:false }));

// ── LAZY INIT: inject canvases & create charts ─────────
function initSlotCharts(i) {
  if (chartsAcc[i]) return;

  const out = document.getElementById(`out-${i}`);
  if (!out) return;
  const parent = out.parentElement;

  const wrap = document.createElement("div");
  wrap.className = "d-flex gap-2 mb-2";
  wrap.innerHTML = `
    <div style="flex:1;min-width:120px">
      <canvas id="acc-${i}"  style="width:100%;height:150px"></canvas>
    </div>
    <div style="flex:1;min-width:120px">
      <canvas id="gyro-${i}" style="width:100%;height:150px"></canvas>
    </div>
  `;
  parent.appendChild(wrap);

  // Common options
  const baseOpts = {
    animation:{ duration:0 },
    plugins: {
      legend: { display:true, position:"bottom" }
    },
    scales: {
      x: {
        type:"linear",
        min: Date.now() - WINDOW_MS,
        max: Date.now(),
        ticks:{ display:false }
      },
      y: { beginAtZero:false }
    },
    elements: {
      line: { tension:0.3, borderWidth:1 },
      point:{ radius:0 }
    }
  };

  // ACCEL chart
  {
    const ctx = document.getElementById(`acc-${i}`).getContext("2d");
    const cfg = JSON.parse(JSON.stringify(baseOpts));
    cfg.plugins.title = { display:true, text:"Accelerometer (g)" };
    chartsAcc[i] = new Chart(ctx, {
      type:"line",
      data:{ datasets:[
        { label:"AX", data:[], borderColor:"red"   },
        { label:"AY", data:[], borderColor:"green" },
        { label:"AZ", data:[], borderColor:"blue"  }
      ]},
      options: cfg
    });
  }

  // GYRO chart
  {
    const ctx = document.getElementById(`gyro-${i}`).getContext("2d");
    const cfg = JSON.parse(JSON.stringify(baseOpts));
    cfg.plugins.title = { display:true, text:"Gyroscope (°/s)" };
    chartsGyro[i] = new Chart(ctx, {
      type:"line",
      data:{ datasets:[
        { label:"GX", data:[], borderColor:"#3498db" },
        { label:"GY", data:[], borderColor:"#9b59b6" },
        { label:"GZ", data:[], borderColor:"#e67e22" }
      ]},
      options: cfg
    });
  }
}

// ── EXPORT: call from onIMUData(event,index) ──────────
function updateCharts(i, { ax, ay, az, gx, gy, gz }) {
  initSlotCharts(i);

  const now = Date.now();

  // — ACCEL: push & prune —
  const aChart = chartsAcc[i];
  [ax, ay, az].forEach((v, di) => {
    const ds = aChart.data.datasets[di].data;
    ds.push({ x: now, y: v });
    while (ds.length && ds[0].x < now - WINDOW_MS) ds.shift();
  });
  // Dynamic Y‐scale for accel
  {
    const ys = chartsAcc[i].data.datasets.flatMap(ds => ds.data.map(pt => pt.y));
    const min = Math.min(...ys), max = Math.max(...ys);
    const pad = (max - min) * 0.1 || 1;
    aChart.options.scales.y.min = min - pad;
    aChart.options.scales.y.max = max + pad;
  }
  aChart.options.scales.x.min = now - WINDOW_MS;
  aChart.options.scales.x.max = now;
  aChart.update();

  // — GYRO: smooth, push & prune —
  const st = gyroState[i];
  if (!st.init) {
    st.gx=gx; st.gy=gy; st.gz=gz; st.init=true;
  } else {
    st.gx = GYRO_ALPHA*gx + (1-GYRO_ALPHA)*st.gx;
    st.gy = GYRO_ALPHA*gy + (1-GYRO_ALPHA)*st.gy;
    st.gz = GYRO_ALPHA*gz + (1-GYRO_ALPHA)*st.gz;
  }
  const gChart = chartsGyro[i];
  [st.gx, st.gy, st.gz].forEach((v, di) => {
    const ds = gChart.data.datasets[di].data;
    ds.push({ x: now, y: v });
    while (ds.length && ds[0].x < now - WINDOW_MS) ds.shift();
  });
  // Dynamic Y‐scale for gyro
  {
    const ys = chartsGyro[i].data.datasets.flatMap(ds => ds.data.map(pt => pt.y));
    const min = Math.min(...ys), max = Math.max(...ys);
    const pad = (max - min) * 0.1 || 1;
    gChart.options.scales.y.min = min - pad;
    gChart.options.scales.y.max = max + pad;
  }
  gChart.options.scales.x.min = now - WINDOW_MS;
  gChart.options.scales.x.max = now;
  gChart.update();
}

window.updateCharts = updateCharts;
