// ASTM D-3588 / GPA 2145-09 component constants @ 60°F, 14.696 psia (ideal, dry)
const COMPONENTS = [
  { key: "he", label: "Helium (He)", mw: 4.003, hhv: 0, lhv: 0, sg: 0.1382, b: 0.9980 },
  { key: "n2", label: "Nitrogen (N₂)", mw: 28.014, hhv: 0, lhv: 0, sg: 0.9672, b: 0.9995 },
  { key: "co2", label: "CO₂", mw: 44.010, hhv: 0, lhv: 0, sg: 1.5196, b: 0.9994 },
  { key: "ch4", label: "Methane (CH₄)", mw: 16.043, hhv: 1010.0, lhv: 909.4, sg: 0.5539, b: 0.9974 },
  { key: "c2h6", label: "Ethane (C₂H₆)", mw: 30.070, hhv: 1769.7, lhv: 1618.7, sg: 1.0382, b: 0.9916 },
  { key: "c3h8", label: "Propane (C₃H₈)", mw: 44.097, hhv: 2516.1, lhv: 2314.9, sg: 1.5226, b: 0.9830 },
  { key: "ic4", label: "Iso-Butane (i-C₄)", mw: 58.123, hhv: 3251.9, lhv: 3000.4, sg: 2.0068, b: 0.9734 },
  { key: "nc4", label: "n-Butane (n-C₄)", mw: 58.123, hhv: 3262.3, lhv: 3010.8, sg: 2.0068, b: 0.9730 },
  { key: "neoc5", label: "neo-Pentane", mw: 72.151, hhv: 3992.4, lhv: 3685.0, sg: 2.4913, b: 0.9620 },
  { key: "ic5", label: "iso-Pentane (i-C₅)", mw: 72.150, hhv: 4000.9, lhv: 3699.0, sg: 2.4912, b: 0.9620 },
  { key: "nc5", label: "n-Pentane (n-C₅)", mw: 72.150, hhv: 4008.9, lhv: 3706.9, sg: 2.4912, b: 0.9620 },
];

const MARI_SAMPLES = [
  {
    id: "raw",
    label: "Raw Gas",
    location: "Guru-02B Separator",
    samplePoint: "Guru-02B Metering",
    sampleType: "Raw Gas",
    time: "1830",
    pressurePsig: 1215,
    tempF: 155,
    flow: 46.2,
    theme: "raw",
    comp: {
      he: 0.0121, n2: 11.2800, co2: 44.2919, ch4: 41.4621,
      c2h6: 2.0591, c3h8: 0.4655, ic4: 0.0856, nc4: 0.0938,
      neoc5: 0.0017, ic5: 0.0439, nc5: 0.0293,
    },
  },
  {
    id: "permeate",
    label: "Permeate Gas",
    location: "Guru-02B SSM",
    samplePoint: "N/A",
    sampleType: "Permeate Gas",
    time: "1855",
    pressurePsig: 10,
    tempF: 113,
    flow: 7.9,
    theme: "permeate",
    comp: {
      he: 0.0217, n2: 4.3829, co2: 74.6079, ch4: 19.8140,
      c2h6: 0.7401, c3h8: 0.1240, ic4: 0.0194, nc4: 0.0267,
      neoc5: 0.0004, ic5: 0.0123, nc5: 0.0102,
    },
  },
  {
    id: "product",
    label: "Natural Gas",
    location: "Compressor Discharge SVPF",
    samplePoint: "Metering",
    sampleType: "Natural Gas",
    time: "2210",
    pressurePsig: 90.3,
    tempF: 101,
    flow: null,
    theme: "product",
    comp: {
      he: 0.0291, n2: 17.2292, co2: 10.7090, ch4: 71.5809,
      c2h6: 0.3649, c3h8: 0.0437, ic4: 0.0107, nc4: 0.0101,
      neoc5: 0.0017, ic5: 0.0053, nc5: 0.0034,
    },
  },
];

const SAMPLE_COLORS = { raw: "#2563eb", permeate: "#f97316", product: "#22c55e" };
const P_CORR = 14.73 / 14.696;

function fmt(n, decimals = 1) {
  if (!isFinite(n)) return "—";
  return Number(n).toFixed(decimals);
}

function normalizeComp(comp) {
  const total = COMPONENTS.reduce((s, c) => s + (comp[c.key] || 0), 0);
  const y = {};
  COMPONENTS.forEach((c) => { y[c.key] = (comp[c.key] || 0) / total; });
  return { y, total };
}

function analyzeSample(sample) {
  const { y, total } = normalizeComp(sample.comp);

  let mw = 0;
  let idealRd = 0;
  let idealHhv = 0;
  let idealLhv = 0;
  let z = 0;

  COMPONENTS.forEach((c) => {
    const f = y[c.key] || 0;
    mw += f * c.mw;
    idealRd += f * c.sg;
    idealHhv += f * c.hhv * P_CORR;
    idealLhv += f * c.lhv * P_CORR;
    z += f * c.b;
  });

  const realRd = idealRd / z;
  const realHhv = idealHhv / z;
  const realLhv = idealLhv / z;
  const wiIdeal = idealHhv / Math.sqrt(idealRd);
  const wiReal = realHhv / Math.sqrt(realRd);
  const hcPlus = COMPONENTS.filter((c) => !["he", "n2", "co2", "ch4"].includes(c.key))
    .reduce((s, c) => s + (sample.comp[c.key] || 0), 0);

  return {
    mw, z, idealRd, realRd, idealHhv, idealLhv, realHhv, realLhv,
    wiIdeal, wiReal, y, total, hcPlus,
    inerts: (sample.comp.co2 || 0) + (sample.comp.n2 || 0),
  };
}

function renderMeta() {
  document.getElementById("mari-meta").innerHTML = `
    <div class="gas-banner-grid">
      <div class="gas-banner-item">
        <span class="gas-banner-label">Field</span>
        <span class="gas-banner-value">Mari Gas Field, Daharki, Sindh</span>
      </div>
      <div class="gas-banner-item">
        <span class="gas-banner-label">Operator</span>
        <span class="gas-banner-value">MARI Energies Limited</span>
      </div>
      <div class="gas-banner-item">
        <span class="gas-banner-label">Sampling Date</span>
        <span class="gas-banner-value">5 June 2026</span>
      </div>
      <div class="gas-banner-item">
        <span class="gas-banner-label">Collected By</span>
        <span class="gas-banner-value">Touqeer Ahmed</span>
      </div>
    </div>`;
}

function renderKpiStrip(results) {
  document.getElementById("gas-kpi-strip").innerHTML = MARI_SAMPLES.map((sample, i) => {
    const r = results[i];
    return `
      <article class="gas-kpi-card gas-kpi-${sample.theme}">
        <div class="gas-kpi-head">
          <h3 class="gas-kpi-title">${sample.label}</h3>
          <p class="gas-kpi-loc">${sample.location}</p>
        </div>
        <dl class="gas-kpi-metrics">
          <div class="gas-kpi-metric primary">
            <dt>Ideal Relative Density</dt>
            <dd>${fmt(r.idealRd, 4)}</dd>
          </div>
          <div class="gas-kpi-metric primary">
            <dt>Ideal Gross HV</dt>
            <dd>${fmt(r.idealHhv, 1)} <small>Btu/scf</small></dd>
          </div>
          <div class="gas-kpi-metric primary">
            <dt>Wobbe Index</dt>
            <dd>${fmt(r.wiIdeal, 1)} <small>Btu/scf</small></dd>
          </div>
        </dl>
        <div class="gas-kpi-ops">
          <span>${sample.pressurePsig} psig</span>
          <span>${sample.tempF} °F</span>
          <span>${sample.flow != null ? sample.flow + " MMSCFD" : "Flow N/A"}</span>
        </div>
      </article>`;
  }).join("");
}

function renderCompareTable(results) {
  const groups = [
    {
      title: "Operating Conditions",
      rows: [
        ["Line pressure", (_, i) => `${MARI_SAMPLES[i].pressurePsig} psig`],
        ["Line temperature", (_, i) => `${MARI_SAMPLES[i].tempF} °F`],
        ["Flow rate", (_, i) => MARI_SAMPLES[i].flow != null ? `${MARI_SAMPLES[i].flow} MMSCFD` : "N/A"],
        ["Sample time", (_, i) => `${MARI_SAMPLES[i].time} hrs`],
      ],
    },
    {
      title: "ASTM D-3588 — Ideal Properties",
      rows: [
        ["Ideal relative density", (s) => fmt(s.idealRd, 4), true],
        ["Ideal gross heating value", (s) => `${fmt(s.idealHhv, 1)} Btu/scf`, true],
        ["Ideal net heating value", (s) => `${fmt(s.idealLhv, 1)} Btu/scf`],
        ["Wobbe index (superior)", (s) => `${fmt(s.wiIdeal, 1)} Btu/scf`, true],
      ],
    },
    {
      title: "Real Gas Correction (GPA 2172)",
      rows: [
        ["Compressibility Z", (s) => fmt(s.z, 4)],
        ["Real relative density", (s) => fmt(s.realRd, 4)],
        ["Real gross heating value", (s) => `${fmt(s.realHhv, 1)} Btu/scf`],
        ["Wobbe index (real)", (s) => `${fmt(s.wiReal, 1)} Btu/scf`],
      ],
    },
    {
      title: "Composition Summary",
      rows: [
        ["Molecular weight", (s) => `${fmt(s.mw, 2)} lb/lbmol`],
        ["Methane (CH₄)", (s, i) => `${fmt(MARI_SAMPLES[i].comp.ch4, 2)} mol%`],
        ["CO₂", (s, i) => `${fmt(MARI_SAMPLES[i].comp.co2, 2)} mol%`],
        ["N₂", (s, i) => `${fmt(MARI_SAMPLES[i].comp.n2, 2)} mol%`],
        ["C₂+ hydrocarbons", (s) => `${fmt(s.hcPlus, 2)} mol%`],
        ["CO₂ + N₂ (inerts)", (s) => `${fmt(s.inerts, 2)} mol%`],
      ],
    },
  ];

  document.getElementById("compare-body").innerHTML = groups.map((group) => {
    const header = `<tr class="gas-group-row"><td colspan="4">${group.title}</td></tr>`;
    const body = group.rows.map(([label, fn, key]) => {
      const cls = key ? ' class="gas-key-row"' : "";
      return `<tr${cls}>
        <td class="gas-prop-cell">${label}</td>
        ${results.map((s, i) => `<td class="gas-num-cell">${fn(s, i)}</td>`).join("")}
      </tr>`;
    }).join("");
    return header + body;
  }).join("");
}

function renderSampleCards(results) {
  document.getElementById("mari-samples").innerHTML = MARI_SAMPLES.map((sample, i) => {
    const r = results[i];
    const compRows = COMPONENTS.map((c) => {
      const v = sample.comp[c.key] || 0;
      if (v < 0.0001) return "";
      return `<tr>
        <td>${c.label}</td>
        <td class="gas-num-cell">${fmt(v, 4)}</td>
        <td class="gas-num-cell">${fmt(r.y[c.key] * 100, 4)}</td>
      </tr>`;
    }).join("");

    return `
      <article class="mari-card gas-sample-card gas-sample-${sample.theme}">
        <header class="gas-card-head">
          <div>
            <h3 class="gas-card-title">${sample.label}</h3>
            <p class="gas-card-sub">${sample.location}</p>
          </div>
          <div class="gas-card-badge">${sample.sampleType}</div>
        </header>
        <div class="gas-card-meta">
          <span>Time: ${sample.time} hrs</span>
          <span>Point: ${sample.samplePoint}</span>
          <span>P: ${sample.pressurePsig} psig</span>
          <span>T: ${sample.tempF} °F</span>
        </div>
        <div class="results-table-wrap">
          <table class="results-table gas-comp-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Reported mol%</th>
                <th>Normalized mol%</th>
              </tr>
            </thead>
            <tbody>
              ${compRows}
              <tr class="gas-total-row">
                <td><strong>Total</strong></td>
                <td class="gas-num-cell"><strong>${fmt(r.total, 4)}</strong></td>
                <td class="gas-num-cell"><strong>100.0000</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>`;
  }).join("");
}

function drawBarChart(results) {
  const canvas = document.getElementById("mari-bar-chart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.parentElement.clientWidth || 860;
  const cssH = 300;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.scale(dpr, dpr);

  const w = cssW;
  const h = cssH;
  const pad = { top: 36, right: 24, bottom: 56, left: 64 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const metrics = [
    { key: "idealHhv", label: "Ideal Gross HV" },
    { key: "wiIdeal", label: "Wobbe Index" },
  ];
  const colors = MARI_SAMPLES.map((s) => SAMPLE_COLORS[s.theme]);
  const maxVal = Math.max(...results.flatMap((r) => metrics.map((m) => r[m.key]))) * 1.08;

  ctx.clearRect(0, 0, w, h);

  // Y-axis grid
  const yTicks = 5;
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  for (let t = 0; t <= yTicks; t++) {
    const val = (maxVal / yTicks) * t;
    const y = pad.top + plotH - (val / maxVal) * plotH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(Math.round(val).toString(), pad.left - 8, y + 4);
  }

  const groupW = plotW / metrics.length;
  const barW = Math.min(48, groupW / 5);

  metrics.forEach((metric, gi) => {
    const gx = pad.left + gi * groupW + groupW / 2;
    results.forEach((r, si) => {
      const val = r[metric.key];
      const bh = (val / maxVal) * plotH;
      const x = gx - (barW * 1.5 + 6) + si * (barW + 6);
      ctx.fillStyle = colors[si];
      ctx.beginPath();
      ctx.roundRect(x, pad.top + plotH - bh, barW, bh, 4);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(fmt(val, 0), x + barW / 2, pad.top + plotH - bh - 8);
    });

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(metric.label, gx, h - 28);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Btu/scf", gx, h - 12);
  });

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
}

function calculateAll() {
  const results = MARI_SAMPLES.map(analyzeSample);
  renderMeta();
  renderKpiStrip(results);
  renderCompareTable(results);
  renderSampleCards(results);
  drawBarChart(results);
}

calculateAll();
window.addEventListener("resize", () => {
  const results = MARI_SAMPLES.map(analyzeSample);
  drawBarChart(results);
});
