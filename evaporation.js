// Water sample data — ppm (mg/L)
// "ions" are summed for composition; "info" rows are reference only (not summed)
const SAMPLES = {
  raw: {
    label: "Raw Water",
    tds: 760,
    rows: [
      { key: "bicarbonate", label: "Bicarbonate (HCO₃⁻)", ppm: 430, ion: true },
      { key: "calcium", label: "Calcium (Ca²⁺)", ppm: 30, ion: true },
      { key: "chloride", label: "Chloride (Cl⁻)", ppm: 30, ion: true },
      { key: "magnesium", label: "Magnesium (Mg²⁺)", ppm: 43, ion: true },
      { key: "potassium", label: "Potassium (K⁺)", ppm: 3, ion: true },
      { key: "sodium", label: "Sodium (Na⁺)", ppm: 200, ion: true },
      { key: "sulfate", label: "Sulfate (SO₄²⁻)", ppm: 185, ion: true },
      { key: "nitrateN", label: "Nitrate as N", ppm: 0.47, ion: true, asN: true },
      { key: "carbonate", label: "Carbonate (CO₃²⁻)", ppm: 0, ion: true, note: "Nil" },
      { key: "alkalinity", label: "Alkalinity as CaCO₃", ppm: 8.6, ion: false, ref: true },
      { key: "hardness", label: "Hardness as CaCO₃", ppm: 250, ion: false, ref: true },
    ],
  },
  product: {
    label: "Product Water",
    tds: 207,
    rows: [
      { key: "bicarbonate", label: "Bicarbonate (HCO₃⁻)", ppm: 40, ion: true },
      { key: "calcium", label: "Calcium (Ca²⁺)", ppm: 30, ion: true },
      { key: "chloride", label: "Chloride (Cl⁻)", ppm: 75, ion: true },
      { key: "magnesium", label: "Magnesium (Mg²⁺)", ppm: 21, ion: true },
      { key: "potassium", label: "Potassium (K⁺)", ppm: 1, ion: true },
      { key: "sodium", label: "Sodium (Na⁺)", ppm: 12, ion: true },
      { key: "sulfate", label: "Sulfate (SO₄²⁻)", ppm: 45, ion: true },
      { key: "nitrateN", label: "Nitrate as N", ppm: 0, ion: true, note: "BDL" },
      { key: "carbonate", label: "Carbonate (CO₃²⁻)", ppm: 0, ion: true, note: "Nil" },
      { key: "alkalinity", label: "Alkalinity as CaCO₃", ppm: 0.8, ion: false, ref: true },
      { key: "hardness", label: "Hardness as CaCO₃", ppm: 160, ion: false, ref: true },
    ],
  },
};

const COLORS = {
  bicarbonate: "#2563eb",
  calcium: "#60a5fa",
  chloride: "#f97316",
  magnesium: "#ea580c",
  potassium: "#a855f7",
  sodium: "#f59e0b",
  sulfate: "#22c55e",
  nitrateN: "#94a3b8",
  carbonate: "#64748b",
};

const volumeInput = document.getElementById("water-volume");

function formatNum(n, d = 4) {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toExponential(2);
  return parseFloat(n.toPrecision(d)).toString();
}

function ppmToKg(ppm, volumeM3) {
  // ppm = mg/L, volume m³ = 1000 L per m³
  // mass kg = ppm * volumeL / 1e6 = ppm * volumeM3 * 1000 / 1e6 = ppm * volumeM3 * 0.001
  return (ppm * volumeM3) / 1000;
}

function calculateSample(sample, volumeM3) {
  const ions = sample.rows.filter((r) => r.ion);
  const items = ions.map((row) => {
    const massKg = ppmToKg(row.ppm, volumeM3);
    return { ...row, massKg };
  });

  const ionSumKg = items.reduce((s, i) => s + i.massKg, 0);
  const tdsKg = ppmToKg(sample.tds, volumeM3);

  const withPct = items.map((item) => ({
    ...item,
    pct: ionSumKg > 0 ? (item.massKg / ionSumKg) * 100 : 0,
  }));

  const refRows = sample.rows.filter((r) => r.ref);

  return { items: withPct, refRows, ionSumKg, tdsKg, tds: sample.tds };
}

function renderTable(tableId, result, sample) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  let html = result.items.map((item) => {
    const ppmDisplay = item.note || (item.ppm === 0 && item.note !== undefined ? item.note : formatNum(item.ppm));
    const rowClass = item.massKg < 0.001 && item.ppm === 0 ? "minor-row" : "";
    return `<tr class="${rowClass}">
      <td>${item.label}</td>
      <td>${item.note ? item.note : formatNum(item.ppm)}</td>
      <td class="result-cell">${formatNum(item.massKg)}</td>
      <td class="result-cell">${item.massKg > 0 ? formatNum(item.pct, 3) : "—"}</td>
    </tr>`;
  }).join("");

  html += result.refRows.map((row) =>
    `<tr class="ref-row">
      <td>${row.label} <em>(ref.)</em></td>
      <td>${formatNum(row.ppm)}</td>
      <td colspan="2">Not summed — derived parameter</td>
    </tr>`
  ).join("");

  html += `<tr class="total-row">
    <td><strong>Sum of ions</strong></td>
    <td>—</td>
    <td class="result-cell"><strong>${formatNum(result.ionSumKg)}</strong></td>
    <td class="result-cell"><strong>100%</strong></td>
  </tr>`;

  html += `<tr class="tds-row">
    <td><strong>TDS (reported)</strong></td>
    <td>${formatNum(sample.tds)}</td>
    <td class="result-cell"><strong>${formatNum(result.tdsKg)}</strong></td>
    <td>—</td>
  </tr>`;

  tbody.innerHTML = html;
}

function renderSummary(elId, result, volumeM3, label) {
  const el = document.getElementById(elId);
  el.innerHTML = `
    <div class="drain-summary-grid">
      <div class="summary-item"><span class="summary-label">Sample</span><span class="summary-value">${label}</span></div>
      <div class="summary-item"><span class="summary-label">Water volume</span><span class="summary-value">${formatNum(volumeM3)} m³ (${formatNum(volumeM3 * 1000)} L)</span></div>
      <div class="summary-item highlight"><span class="summary-label">Total solids (TDS basis)</span><span class="summary-value">${formatNum(result.tdsKg)} kg (${formatNum(result.tdsKg * 1000)} g)</span></div>
      <div class="summary-item"><span class="summary-label">Sum of individual ions</span><span class="summary-value">${formatNum(result.ionSumKg)} kg</span></div>
    </div>`;
}

function drawChart(canvasId, result) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  const data = result.items.filter((i) => i.massKg > 0.0001);
  const total = data.reduce((s, d) => s + d.massKg, 0);

  ctx.clearRect(0, 0, w, h);

  if (total === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No significant solids", w / 2, h / 2);
    return;
  }

  const cx = 90;
  const cy = h / 2;
  const r = 72;
  let angle = -Math.PI / 2;

  data.forEach((item) => {
    const slice = (item.massKg / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[item.key] || "#64748b";
    ctx.fill();
    angle += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${formatNum(result.tdsKg)} kg`, cx, cy - 4);
  ctx.font = "9px sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("TDS solids", cx, cy + 10);

  let ly = 24;
  ctx.textAlign = "left";
  data.forEach((item) => {
    ctx.fillStyle = COLORS[item.key] || "#64748b";
    ctx.fillRect(190, ly - 8, 12, 12);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "10px sans-serif";
    ctx.fillText(`${item.label.split("(")[0].trim()} ${formatNum(item.pct, 3)}%`, 208, ly);
    ly += 18;
  });
}

const BAR_LABELS = {
  bicarbonate: "HCO₃⁻",
  calcium: "Ca²⁺",
  chloride: "Cl⁻",
  magnesium: "Mg²⁺",
  potassium: "K⁺",
  sodium: "Na⁺",
  sulfate: "SO₄²⁻",
  nitrateN: "NO₃-N",
  tds: "TDS",
};

const BAR_KEYS = ["bicarbonate", "sodium", "sulfate", "magnesium", "calcium", "chloride", "potassium", "nitrateN", "tds"];

function getMassByKey(result, key) {
  if (key === "tds") return result.tdsKg;
  const item = result.items.find((i) => i.key === key);
  return item ? item.massKg : 0;
}

function drawCompareBarChart(raw, product) {
  const canvas = document.getElementById("compare-bar-chart");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = { top: 28, right: 20, bottom: 72, left: 52 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const rawVals = BAR_KEYS.map((k) => getMassByKey(raw, k));
  const prodVals = BAR_KEYS.map((k) => getMassByKey(product, k));
  const maxVal = Math.max(...rawVals, ...prodVals, 1);

  ctx.clearRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const val = (i / 5) * maxVal;
    const y = pad.top + plotH - (val / maxVal) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(formatNum(val, 3), pad.left - 6, y + 3);
  }

  // Axes
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  ctx.fillStyle = "#2563eb";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.save();
  ctx.translate(16, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Mass (kg)", 0, 0);
  ctx.restore();
  ctx.fillText("Parameter", pad.left + plotW / 2, h - 12);

  const groupW = plotW / BAR_KEYS.length;
  const barW = groupW * 0.28;
  const gap = groupW * 0.08;

  BAR_KEYS.forEach((key, i) => {
    const gx = pad.left + i * groupW + groupW / 2;
    const rawH = (rawVals[i] / maxVal) * plotH;
    const prodH = (prodVals[i] / maxVal) * plotH;
    const baseY = pad.top + plotH;

    // Raw bar
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(gx - barW - gap / 2, baseY - rawH, barW, rawH);

    // Product bar
    ctx.fillStyle = "#f97316";
    ctx.fillRect(gx + gap / 2, baseY - prodH, barW, prodH);

    // Value labels on taller bars
    if (rawH > 16) {
      ctx.fillStyle = "#fff";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatNum(rawVals[i], 3), gx - barW / 2 - gap / 2, baseY - rawH + 12);
    }
    if (prodH > 16) {
      ctx.fillStyle = "#fff";
      ctx.font = "8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatNum(prodVals[i], 3), gx + barW / 2 + gap / 2, baseY - prodH + 12);
    }

    // X labels
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(BAR_LABELS[key], gx, baseY + 14);
  });
}

function calculate() {
  const volumeM3 = parseFloat(volumeInput.value);
  if (!volumeM3 || volumeM3 <= 0) return;

  const raw = calculateSample(SAMPLES.raw, volumeM3);
  const product = calculateSample(SAMPLES.product, volumeM3);

  renderSummary("raw-summary", raw, volumeM3, "Raw Water");
  renderSummary("product-summary", product, volumeM3, "Product Water");
  renderTable("raw-table", raw, SAMPLES.raw);
  renderTable("product-table", product, SAMPLES.product);
  drawChart("raw-chart", raw);
  drawChart("product-chart", product);
  drawCompareBarChart(raw, product);

  document.getElementById("evap-notes").innerHTML = `
    <p><strong>Quick summary for ${formatNum(volumeM3)} m³:</strong>
    Raw water → <strong>${formatNum(raw.tdsKg)} kg</strong> solids (TDS ${SAMPLES.raw.tds} ppm) &nbsp;|&nbsp;
    Product water → <strong>${formatNum(product.tdsKg)} kg</strong> solids (TDS ${SAMPLES.product.tds} ppm)</p>`;

  document.getElementById("live-results").innerHTML = `
    <h3 class="method-heading">8. Your Current Results (${formatNum(volumeM3)} m³)</h3>
    <div class="example-box">
      <p><strong>Raw Water</strong> — TDS: ${formatNum(raw.tdsKg)} kg | Ion sum: ${formatNum(raw.ionSumKg)} kg</p>
      <p>Largest contributors: Bicarbonate ${formatNum(getMassByKey(raw, "bicarbonate"))} kg,
      Sodium ${formatNum(getMassByKey(raw, "sodium"))} kg,
      Sulfate ${formatNum(getMassByKey(raw, "sulfate"))} kg</p>
    </div>
    <div class="example-box">
      <p><strong>Product Water</strong> — TDS: ${formatNum(product.tdsKg)} kg | Ion sum: ${formatNum(product.ionSumKg)} kg</p>
      <p>Largest contributors: Chloride ${formatNum(getMassByKey(product, "chloride"))} kg,
      Sulfate ${formatNum(getMassByKey(product, "sulfate"))} kg,
      Bicarbonate ${formatNum(getMassByKey(product, "bicarbonate"))} kg</p>
    </div>
    <p class="example-note">Formula used: m (kg) = ppm × ${formatNum(volumeM3)} ÷ 1,000</p>`;
}

document.getElementById("calc-btn").addEventListener("click", calculate);
volumeInput.addEventListener("input", calculate);
calculate();
