const vesselTypeSelect = document.getElementById("vessel-type");
const sphereInputs = document.getElementById("sphere-inputs");
const cylinderInputs = document.getElementById("cylinder-inputs");
const pressInputs = document.getElementById("press-inputs");
const pressEnabled = document.getElementById("press-enabled");
const pressMode = document.getElementById("press-mode");
const ullageRow = document.getElementById("ullage-row");
const summaryEl = document.getElementById("drain-summary");
const legendEl = document.getElementById("graph-legend");
const vesselCanvas = document.getElementById("vessel-canvas");
const graphCanvas = document.getElementById("graph-canvas");
const timeSlider = document.getElementById("time-slider");
const timeDisplay = document.getElementById("time-display");
const playBtn = document.getElementById("play-btn");
const visualTitle = document.getElementById("visual-title");

const vesselCtx = vesselCanvas.getContext("2d");
const graphCtx = graphCanvas.getContext("2d");

const RHO = 1000;
const G = 9.81;

const PRESS_TO_BAR = { bar: 1, kPa: 0.01, psi: 0.0689475729 };

let state = {
  type: "sphere",
  volume: 100,
  rate: 0.001,
  radius: 0,
  length: 0,
  diameter: 0,
  drainTime: 0,
  baselineTime: 0,
  points: [],
  baselinePoints: [],
  pressurized: false,
  animId: null,
  playing: false,
};

// ── Geometry ──────────────────────────────────────────────────

function sphereRadius(volume) {
  return Math.cbrt((3 * volume) / (4 * Math.PI));
}

function sphereVolumeFromHeight(h, R) {
  return (Math.PI * h * h / 3) * (3 * R - h);
}

function cylinderSegmentArea(h, R) {
  if (h <= 0) return 0;
  if (h >= 2 * R) return Math.PI * R * R;
  return R * R * Math.acos((R - h) / R) - (R - h) * Math.sqrt(2 * R * h - h * h);
}

function cylinderVolumeFromHeight(h, R, L) {
  return cylinderSegmentArea(h, R) * L;
}

function heightFromVolume(V, R, type, L) {
  const vMax = type === "sphere"
    ? (4 / 3) * Math.PI * R ** 3
    : Math.PI * R * R * L;

  if (V <= 0) return 0;
  if (V >= vMax) return 2 * R;

  let lo = 0;
  let hi = 2 * R;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const vMid = type === "sphere"
      ? sphereVolumeFromHeight(mid, R)
      : cylinderVolumeFromHeight(mid, R, L);
    if (vMid < V) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Formatting ────────────────────────────────────────────────

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h} h ${m} min ${s} s`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

function formatNum(n, d = 4) {
  if (!isFinite(n)) return "—";
  return parseFloat(n.toPrecision(d)).toString();
}

// ── Simulation ────────────────────────────────────────────────

function getInputs() {
  let base;
  if (vesselTypeSelect.value === "sphere") {
    base = {
      type: "sphere",
      volume: parseFloat(document.getElementById("sphere-volume").value),
      rate: parseFloat(document.getElementById("sphere-rate").value),
      diameter: null,
      length: null,
    };
  } else {
    const diameter = parseFloat(document.getElementById("cyl-diameter").value);
    const length = parseFloat(document.getElementById("cyl-length").value);
    const rate = parseFloat(document.getElementById("cyl-rate").value);
    const radius = diameter / 2;
    base = {
      type: "cylinder",
      volume: Math.PI * radius * radius * length,
      rate,
      diameter,
      length,
    };
  }

  const pressurized = pressEnabled.checked;
  const pressBar = pressurized
    ? parseFloat(document.getElementById("press-pressure").value) * PRESS_TO_BAR[document.getElementById("press-unit").value]
    : 0;

  return {
    ...base,
    pressurized,
    pressBar,
    pressMode: document.getElementById("press-mode").value,
    ullagePct: parseFloat(document.getElementById("ullage-pct").value) || 5,
  };
}

function buildConstantRatePoints(volume, rate, R, type, length) {
  const drainTime = volume / rate;
  const steps = 200;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * drainTime;
    const vRemain = Math.max(0, volume - rate * t);
    const h = heightFromVolume(vRemain, R, type, length);
    points.push({
      t,
      vRemain,
      h,
      levelPct: (vRemain / volume) * 100,
      airPressure: 0,
      flowRate: rate,
    });
  }
  return { drainTime, points };
}

function buildPressurizedSimulation(inputs) {
  const { type, volume, rate: qMax, diameter, length, pressBar, pressMode, ullagePct } = inputs;
  const R = type === "sphere" ? sphereRadius(volume) : diameter / 2;
  const hMax = 2 * R;

  // Calibrate orifice constant from full tank, no air, Q = Q_max
  const k = qMax / Math.sqrt(RHO * G * hMax);

  const vGas0 = volume * Math.max(ullagePct, 0.5) / 100;
  let vLiquid = volume - (pressMode === "sealed" ? vGas0 : 0);
  let pAir = pressBar * 1e5; // Pa gauge
  const pAir0 = pAir;
  const vGasInitial = pressMode === "sealed" ? vGas0 : volume * 0.005;

  const points = [];
  let t = 0;
  const dt = 0.5;
  const maxTime = volume / qMax * 5;

  while (vLiquid > 0 && t < maxTime) {
    const h = heightFromVolume(vLiquid, R, type, length);
    const pHydro = RHO * G * h;
    const pDrive = pAir + pHydro;
    const q = Math.min(qMax, k * Math.sqrt(Math.max(0, pDrive)));

    points.push({
      t,
      vRemain: vLiquid,
      h,
      levelPct: (vLiquid / volume) * 100,
      airPressure: pAir / 1e5,
      flowRate: q,
    });

    vLiquid = Math.max(0, vLiquid - q * dt);
    const vGas = volume - vLiquid;

    if (pressMode === "constant") {
      pAir = pressBar * 1e5;
    } else {
      pAir = pAir0 * vGasInitial / Math.max(vGas, vGasInitial * 0.01);
    }

    t += dt;
  }

  points.push({
    t,
    vRemain: 0,
    h: 0,
    levelPct: 0,
    airPressure: pAir / 1e5,
    flowRate: 0,
  });

  return { drainTime: t, points, k };
}

function buildSimulation(inputs) {
  const { type, volume, rate, diameter, length, pressurized } = inputs;
  const R = type === "sphere" ? sphereRadius(volume) : diameter / 2;

  const baseline = buildConstantRatePoints(volume, rate, R, type, length);

  if (pressurized && inputs.pressBar > 0) {
    const press = buildPressurizedSimulation(inputs);
    return {
      type,
      volume,
      rate,
      radius: R,
      diameter,
      length,
      drainTime: press.drainTime,
      baselineTime: baseline.drainTime,
      points: press.points,
      baselinePoints: baseline.points,
      pressurized: true,
      pressBar: inputs.pressBar,
      pressMode: inputs.pressMode,
    };
  }

  return {
    type,
    volume,
    rate,
    radius: R,
    diameter,
    length,
    drainTime: baseline.drainTime,
    baselineTime: baseline.drainTime,
    points: baseline.points,
    baselinePoints: baseline.points,
    pressurized: false,
  };
}

// ── Drawing helpers ───────────────────────────────────────────

function drawLevelGauge(ctx, w, h, levelPct) {
  const gaugeX = w - 42;
  const gaugeTop = 30;
  const gaugeH = h - 110;

  ctx.fillStyle = "#0a0a0a";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.fillRect(gaugeX - 12, gaugeTop, 24, gaugeH);
  ctx.strokeRect(gaugeX - 12, gaugeTop, 24, gaugeH);

  const fillH = (levelPct / 100) * gaugeH;
  ctx.fillStyle = "rgba(37, 99, 235, 0.7)";
  ctx.fillRect(gaugeX - 10, gaugeTop + gaugeH - fillH, 20, fillH);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  for (let p = 0; p <= 100; p += 25) {
    const y = gaugeTop + gaugeH - (p / 100) * gaugeH;
    ctx.beginPath();
    ctx.moveTo(gaugeX - 14, y);
    ctx.lineTo(gaugeX - 12, y);
    ctx.strokeStyle = "#2563eb";
    ctx.stroke();
    ctx.fillText(`${p}%`, gaugeX, y - 3);
  }

  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("Level", gaugeX, gaugeTop - 8);
}

function drawCircularCrossSection(ctx, cx, cy, rPx, R, liquidH, levelPct, airPressure) {
  const liquidPx = (liquidH / (2 * R)) * (2 * rPx);
  const liquidTop = cy + rPx - liquidPx;

  // Air ullage region
  if (levelPct < 100) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(148, 163, 184, 0.12)";
    ctx.fillRect(cx - rPx, cy - rPx, 2 * rPx, liquidTop - (cy - rPx));
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(37, 99, 235, 0.55)";
  ctx.fillRect(cx - rPx - 1, liquidTop, 2 * rPx + 2, liquidPx + 1);

  if (levelPct > 0 && levelPct < 100) {
    const halfChord = Math.sqrt(Math.max(0, rPx * rPx - (liquidTop - cy) ** 2));
    ctx.beginPath();
    ctx.moveTo(cx - halfChord, liquidTop);
    ctx.lineTo(cx + halfChord, liquidTop);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(cx, cy - rPx);
  ctx.lineTo(cx, cy + rPx);
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.pressurized && levelPct < 100) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AIR", cx, cy - rPx + 14);
    ctx.fillText(`${formatNum(airPressure)} bar`, cx, cy - rPx + 26);
  }

  ctx.fillStyle = "#f97316";
  ctx.font = "9px monospace";
  ctx.textAlign = "right";
  for (let p = 0; p <= 100; p += 25) {
    const y = cy + rPx - (p / 100) * (2 * rPx);
    ctx.beginPath();
    ctx.moveTo(cx - 4, y);
    ctx.lineTo(cx + 4, y);
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillText(`${p}%`, cx - 8, y + 3);
  }
}

function drawDrainValve(ctx, cx, bottomY, flowRate) {
  ctx.fillStyle = "#1a1a1a";
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(cx - 10, bottomY, 20, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f97316";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Valve", cx, bottomY + 18);
  ctx.fillText(`${formatNum(flowRate)} m³/s`, cx, bottomY + 30);
}

function drawCylinderSideView(ctx, w, bottomY, R, L) {
  const sideY = bottomY + 48;
  const maxW = w - 80;
  const scale = Math.min(maxW / L, 28 / (2 * R));
  const tankW = L * scale;
  const tankH = 2 * R * scale;
  const sx = (w - tankW) / 2;
  const sy = sideY;

  ctx.fillStyle = "rgba(37, 99, 235, 0.15)";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy + tankH / 2);
  ctx.arc(sx, sy + tankH / 2, tankH / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(sx + tankW, sy);
  ctx.arc(sx + tankW, sy + tankH / 2, tankH / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`L = ${L} m`, sx + tankW / 2, sy + tankH + 14);
  ctx.fillText(`D = ${2 * R} m`, sx + tankW / 2, sy - 6);
}

function drawVesselView(t) {
  const { type, radius: R, points, length } = state;
  const ctx = vesselCtx;
  const w = vesselCanvas.width;
  const h = vesselCanvas.height;
  const cx = w / 2 - 10;
  const cy = type === "cylinder" ? 155 : h / 2 + 10;
  const scale = type === "cylinder"
    ? Math.min(w - 90, 200) / (2 * R)
    : Math.min(w, h) / (2 * R + 0.8) * 0.82;

  const pt = points.find((p) => p.t >= t) || points[points.length - 1];
  const rPx = R * scale;

  ctx.clearRect(0, 0, w, h);

  const vesselLabel = type === "sphere" ? "Sphere" : "Horizontal cylinder (end view)";
  const pressLabel = state.pressurized ? " — Pressurized" : " — Atmospheric";
  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(vesselLabel + pressLabel, cx, 14);

  drawLevelGauge(ctx, w, h, pt.levelPct);
  drawCircularCrossSection(ctx, cx, cy, rPx, R, pt.h, pt.levelPct, pt.airPressure);
  drawDrainValve(ctx, cx, cy + rPx, pt.flowRate);

  if (type === "cylinder") drawCylinderSideView(ctx, w, cy + rPx, R, length);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Level: ${formatNum(pt.levelPct, 5)}%`, cx, 30);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  let info = `h = ${formatNum(pt.h)} m | V = ${formatNum(pt.vRemain)} m³`;
  if (state.pressurized) info += ` | P_air = ${formatNum(pt.airPressure)} bar`;
  ctx.fillText(info, cx, h - 8);
}

function drawCurve(ctx, points, tMax, pad, plotW, plotH, color, lineWidth, dashed) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (dashed) ctx.setLineDash([6, 4]);
  points.forEach((p, i) => {
    const x = pad.left + (p.t / tMax) * plotW;
    const y = pad.top + plotH - (p.levelPct / 100) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGraph(highlightT) {
  const { drainTime, baselineTime, points, baselinePoints, pressurized } = state;
  const ctx = graphCtx;
  const w = graphCanvas.width;
  const h = graphCanvas.height;
  const pad = { top: 28, right: 24, bottom: 48, left: 56 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const tMax = Math.max(drainTime, baselineTime);

  ctx.clearRect(0, 0, w, h);

  for (let p = 0; p <= 100; p += 25) {
    const y = pad.top + plotH - (p / 100) * plotH;
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${p}%`, pad.left - 6, y + 3);
  }

  for (let i = 0; i <= 5; i++) {
    const t = (i / 5) * tMax;
    const x = pad.left + (t / tMax) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.strokeStyle = "#2a2a2a";
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText(formatNum(t, 4), x, h - 28);
  }

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Time (s)", pad.left + plotW / 2, h - 8);
  ctx.save();
  ctx.translate(14, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Volume level (%)", 0, 0);
  ctx.restore();

  if (pressurized) {
    drawCurve(ctx, baselinePoints, tMax, pad, plotW, plotH, "#2563eb", 2, true);
  }
  drawCurve(ctx, points, tMax, pad, plotW, plotH, "#f97316", 2.5, false);

  const pt = points.find((p) => p.t >= highlightT) || points[points.length - 1];
  const hx = pad.left + (pt.t / tMax) * plotW;
  const hy = pad.top + plotH - (pt.levelPct / 100) * plotH;

  ctx.beginPath();
  ctx.arc(hx, hy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#f97316";
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#f97316";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "left";
  const saved = pressurized ? ` | ${((1 - drainTime / baselineTime) * 100).toFixed(1)}% faster` : "";
  ctx.fillText(`Drain: ${formatDuration(drainTime)}${saved}`, pad.left + 8, pad.top + 16);
}

function updateLegend() {
  if (!state.pressurized) {
    legendEl.innerHTML = `<span class="legend-item"><span class="legend-swatch" style="background:#f97316"></span> Atmospheric (constant Q)</span>`;
    return;
  }
  legendEl.innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:#f97316"></span> Pressurized with air</span>
    <span class="legend-item"><span class="legend-swatch dashed"></span> Atmospheric (no air)</span>`;
}

function updateSummary() {
  const { type, volume, rate, radius, diameter, length, drainTime, baselineTime, pressurized, pressBar, pressMode } = state;
  const vesselName = type === "sphere" ? "Sphere" : "Horizontal cylinder";
  const timeSaved = pressurized ? ((1 - drainTime / baselineTime) * 100) : 0;

  let pressInfo = "";
  if (pressurized) {
    pressInfo = `
      <div class="summary-item"><span class="summary-label">Air pressure</span><span class="summary-value">${formatNum(pressBar)} bar gauge</span></div>
      <div class="summary-item"><span class="summary-label">Air supply</span><span class="summary-value">${pressMode === "constant" ? "Constant (regulated)" : "Sealed (isothermal)"}</span></div>
      <div class="summary-item"><span class="summary-label">Atmospheric drain time</span><span class="summary-value">${formatDuration(baselineTime)}</span></div>
      <div class="summary-item highlight"><span class="summary-label">Pressurized drain time</span><span class="summary-value">${formatDuration(drainTime)} (${timeSaved.toFixed(1)}% faster)</span></div>`;
  } else {
    pressInfo = `
      <div class="summary-item highlight"><span class="summary-label">Drain time (atmospheric)</span><span class="summary-value">${formatDuration(drainTime)}</span></div>`;
  }

  const dimInfo = type === "sphere"
    ? `<div class="summary-item"><span class="summary-label">Radius</span><span class="summary-value">${formatNum(radius)} m</span></div>`
    : `<div class="summary-item"><span class="summary-label">Diameter × Length</span><span class="summary-value">${formatNum(diameter)} m × ${formatNum(length)} m</span></div>`;

  summaryEl.innerHTML = `
    <div class="drain-summary-grid">
      <div class="summary-item"><span class="summary-label">Vessel</span><span class="summary-value">${vesselName}</span></div>
      <div class="summary-item"><span class="summary-label">Volume</span><span class="summary-value">${formatNum(volume)} m³</span></div>
      ${dimInfo}
      <div class="summary-item"><span class="summary-label">Max valve capacity</span><span class="summary-value">${rate} m³/s</span></div>
      ${pressInfo}
    </div>`;
}

function setTime(t) {
  const clamped = Math.max(0, Math.min(state.drainTime, t));
  timeSlider.max = Math.round(Math.max(state.drainTime, state.baselineTime));
  timeSlider.value = clamped;
  const pt = state.points.find((p) => p.t >= clamped) || state.points[state.points.length - 1];
  let txt = `t = ${formatNum(clamped, 5)} s — Level: ${formatNum(pt.levelPct, 5)}% — Q: ${formatNum(pt.flowRate)} m³/s`;
  if (state.pressurized) txt += ` — P_air: ${formatNum(pt.airPressure)} bar`;
  timeDisplay.textContent = txt;
  drawVesselView(clamped);
  drawGraph(clamped);
}

function runSimulation() {
  const inputs = getInputs();
  if (!inputs.volume || !inputs.rate || inputs.volume <= 0 || inputs.rate <= 0) return;

  if (state.animId) cancelAnimationFrame(state.animId);
  state.playing = false;
  playBtn.textContent = "▶ Play";

  state = { ...state, ...buildSimulation(inputs) };
  updateSummary();
  updateLegend();
  setTime(0);
}

function togglePlay() {
  if (state.playing) {
    state.playing = false;
    playBtn.textContent = "▶ Play";
    if (state.animId) cancelAnimationFrame(state.animId);
    return;
  }

  state.playing = true;
  playBtn.textContent = "⏸ Pause";
  let start = null;
  const fromT = parseFloat(timeSlider.value);

  function frame(ts) {
    if (!start) start = ts;
    const elapsed = (ts - start) / 1000;
    const t = fromT + elapsed * (state.drainTime / 30);

    if (t >= state.drainTime) {
      setTime(state.drainTime);
      state.playing = false;
      playBtn.textContent = "▶ Play";
      return;
    }
    setTime(t);
    state.animId = requestAnimationFrame(frame);
  }
  state.animId = requestAnimationFrame(frame);
}

function toggleVesselInputs() {
  const isSphere = vesselTypeSelect.value === "sphere";
  sphereInputs.classList.toggle("hidden", !isSphere);
  cylinderInputs.classList.toggle("hidden", isSphere);
  visualTitle.textContent = isSphere
    ? "Level Indicator — Vertical Diameter"
    : "Level Indicator — End View (Vertical Diameter)";
  runSimulation();
}

function togglePressInputs() {
  pressInputs.classList.toggle("hidden", !pressEnabled.checked);
  ullageRow.classList.toggle("hidden", pressMode.value === "constant");
  runSimulation();
}

vesselTypeSelect.addEventListener("change", toggleVesselInputs);
pressEnabled.addEventListener("change", togglePressInputs);
pressMode.addEventListener("change", togglePressInputs);
document.getElementById("simulate-btn").addEventListener("click", runSimulation);
timeSlider.addEventListener("input", () => setTime(parseFloat(timeSlider.value)));
playBtn.addEventListener("click", togglePlay);

toggleVesselInputs();
togglePressInputs();
