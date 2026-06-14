// Saturated steam table (SI): P in bar, T in °C
// hf, hg in kJ/kg; vf, vg in m³/kg; sf, sg in kJ/(kg·K)
const steamTable = [
  { p: 0.01, T: 6.97,  hf: 29.3,   hg: 2514.4, vf: 0.001004, vg: 129.20,  sf: 0.106, sg: 8.975 },
  { p: 0.05, T: 32.88, hf: 137.8,  hg: 2561.6, vf: 0.001006, vg: 28.03,   sf: 0.476, sg: 8.395 },
  { p: 0.10, T: 45.81, hf: 191.8,  hg: 2585.0, vf: 0.001010, vg: 14.67,   sf: 0.649, sg: 8.150 },
  { p: 0.20, T: 60.06, hf: 251.4,  hg: 2609.8, vf: 0.001015, vg: 7.649,   sf: 0.832, sg: 7.908 },
  { p: 0.50, T: 81.33, hf: 340.5,  hg: 2646.0, vf: 0.001029, vg: 3.240,   sf: 1.076, sg: 7.592 },
  { p: 1.00, T: 99.63, hf: 417.5,  hg: 2676.0, vf: 0.001043, vg: 1.694,   sf: 1.306, sg: 7.359 },
  { p: 2.00, T: 120.2, hf: 504.7,  hg: 2707.0, vf: 0.001061, vg: 0.8857,  sf: 1.530, sg: 7.127 },
  { p: 3.00, T: 133.5, hf: 561.5,  hg: 2725.0, vf: 0.001074, vg: 0.6058,  sf: 1.672, sg: 7.235 },
  { p: 5.00, T: 151.8, hf: 640.1,  hg: 2748.0, vf: 0.001096, vg: 0.3749,  sf: 1.860, sg: 7.127 },
  { p: 7.00, T: 165.0, hf: 697.0,  hg: 2764.0, vf: 0.001108, vg: 0.2729,  sf: 1.992, sg: 7.013 },
  { p: 10.0, T: 179.9, hf: 762.8,  hg: 2778.0, vf: 0.001127, vg: 0.1944,  sf: 2.138, sg: 6.962 },
  { p: 15.0, T: 198.3, hf: 844.8,  hg: 2792.0, vf: 0.001154, vg: 0.1318,  sf: 2.315, sg: 6.716 },
  { p: 20.0, T: 212.4, hf: 906.4,  hg: 2799.0, vf: 0.001177, vg: 0.0996,  sf: 2.447, sg: 6.340 },
  { p: 30.0, T: 234.6, hf: 1008.4, hg: 2804.0, vf: 0.001216, vg: 0.0667,  sf: 2.645, sg: 6.186 },
  { p: 50.0, T: 263.9, hf: 1154.5, hg: 2794.0, vf: 0.001286, vg: 0.0394,  sf: 3.027, sg: 5.592 },
  { p: 70.0, T: 285.8, hf: 1267.0, hg: 2774.0, vf: 0.001352, vg: 0.0274,  sf: 3.314, sg: 5.198 },
  { p: 100.0, T: 311.0, hf: 1407.6, hg: 2724.0, vf: 0.001452, vg: 0.0180,  sf: 3.360, sg: 5.615 },
];

const P_UNITS = {
  bar: 1,
  kPa: 0.01,
  MPa: 10,
  psi: 0.0689475729,
};

const T_UNITS = {
  "°C": (v) => v,
  K: (v) => v - 273.15,
  "°F": (v) => (v - 32) * (5 / 9),
};

const PRESSURE_UNITS = ["bar", "kPa", "MPa", "psi"];
const TEMP_UNITS = ["°C", "K", "°F"];

function formatNum(value, digits = 4) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs < 0.001 || abs >= 1e6) return value.toExponential(4);
  return parseFloat(value.toPrecision(digits)).toString();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateByPressure(pBar) {
  if (pBar < steamTable[0].p || pBar > steamTable[steamTable.length - 1].p) {
    return null;
  }

  for (let i = 0; i < steamTable.length - 1; i++) {
    const lo = steamTable[i];
    const hi = steamTable[i + 1];
    if (pBar >= lo.p && pBar <= hi.p) {
      const t = (pBar - lo.p) / (hi.p - lo.p);
      return {
        p: pBar,
        T: lerp(lo.T, hi.T, t),
        hf: lerp(lo.hf, hi.hf, t),
        hg: lerp(lo.hg, hi.hg, t),
        vf: lerp(lo.vf, hi.vf, t),
        vg: lerp(lo.vg, hi.vg, t),
        sf: lerp(lo.sf, hi.sf, t),
        sg: lerp(lo.sg, hi.sg, t),
      };
    }
  }
  return null;
}

function interpolateByTemperature(tC) {
  if (tC < steamTable[0].T || tC > steamTable[steamTable.length - 1].T) {
    return null;
  }

  for (let i = 0; i < steamTable.length - 1; i++) {
    const lo = steamTable[i];
    const hi = steamTable[i + 1];
    if (tC >= lo.T && tC <= hi.T) {
      const t = (tC - lo.T) / (hi.T - lo.T);
      return {
        p: lerp(lo.p, hi.p, t),
        T: tC,
        hf: lerp(lo.hf, hi.hf, t),
        hg: lerp(lo.hg, hi.hg, t),
        vf: lerp(lo.vf, hi.vf, t),
        vg: lerp(lo.vg, hi.vg, t),
        sf: lerp(lo.sf, hi.sf, t),
        sg: lerp(lo.sg, hi.sg, t),
      };
    }
  }
  return null;
}

function getSaturatedProps(pBar) {
  return interpolateByPressure(pBar);
}

function wetSteamProps(sat, quality) {
  const x = Math.max(0, Math.min(1, quality));
  return {
    p: sat.p,
    T: sat.T,
    h: sat.hf + x * (sat.hg - sat.hf),
    v: sat.vf + x * (sat.vg - sat.vf),
    s: sat.sf + x * (sat.sg - sat.sf),
    x,
    hfg: sat.hg - sat.hf,
    vfg: sat.vg - sat.vf,
    sfg: sat.sg - sat.sf,
  };
}

function toKgPerSec(massFlow, unit) {
  switch (unit) {
    case "kg/s": return massFlow;
    case "kg/h": return massFlow / 3600;
    case "lb/h": return massFlow * 0.45359237 / 3600;
    default: return massFlow / 3600;
  }
}

function pressureToBar(value, unit) {
  return value * P_UNITS[unit];
}

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.tab}-panel`).classList.add("active");
  });
});

// Steam input unit options
const steamInputMode = document.getElementById("steam-input-mode");
const steamInputUnit = document.getElementById("steam-input-unit");

function updateSteamInputUnits() {
  const units = steamInputMode.value === "pressure" ? PRESSURE_UNITS : TEMP_UNITS;
  steamInputUnit.innerHTML = units.map((u) => `<option value="${u}">${u}</option>`).join("");
}

steamInputMode.addEventListener("change", updateSteamInputUnits);
updateSteamInputUnits();

function calcSteamProperties() {
  const mode = steamInputMode.value;
  const value = parseFloat(document.getElementById("steam-input-value").value);
  const unit = steamInputUnit.value;
  const quality = parseFloat(document.getElementById("steam-quality").value);
  const tbody = document.querySelector("#steam-results tbody");

  if (isNaN(value) || isNaN(quality) || quality < 0 || quality > 1) {
    tbody.innerHTML = `<tr><td colspan="3" class="error-msg">Enter valid values (quality 0–1).</td></tr>`;
    return;
  }

  let sat;
  if (mode === "pressure") {
    const pBar = pressureToBar(value, unit);
    sat = interpolateByPressure(pBar);
  } else {
    const tC = T_UNITS[unit](value);
    sat = interpolateByTemperature(tC);
  }

  if (!sat) {
    tbody.innerHTML = `<tr><td colspan="3" class="error-msg">Out of range (0.01–100 bar / ~7–311 °C).</td></tr>`;
    return;
  }

  const props = wetSteamProps(sat, quality);
  const phase = quality === 0 ? "Saturated liquid" : quality === 1 ? "Saturated vapor" : `Wet steam (x = ${quality})`;

  const rows = [
    ["Saturation pressure", formatNum(sat.p), "bar"],
    ["Saturation temperature", formatNum(sat.T), "°C"],
    ["Phase", phase, "—"],
    ["Specific enthalpy (h)", formatNum(props.h), "kJ/kg"],
    ["Saturated liquid enthalpy (hf)", formatNum(sat.hf), "kJ/kg"],
    ["Saturated vapor enthalpy (hg)", formatNum(sat.hg), "kJ/kg"],
    ["Latent heat (hfg)", formatNum(props.hfg), "kJ/kg"],
    ["Specific volume (v)", formatNum(props.v), "m³/kg"],
    ["Saturated liquid volume (vf)", formatNum(sat.vf), "m³/kg"],
    ["Saturated vapor volume (vg)", formatNum(sat.vg), "m³/kg"],
    ["Specific entropy (s)", formatNum(props.s), "kJ/(kg·K)"],
    ["Saturated liquid entropy (sf)", formatNum(sat.sf), "kJ/(kg·K)"],
    ["Saturated vapor entropy (sg)", formatNum(sat.sg), "kJ/(kg·K)"],
  ];

  tbody.innerHTML = rows.map(([prop, val, u]) =>
    `<tr><td>${prop}</td><td class="result-cell">${val}</td><td>${u}</td></tr>`
  ).join("");
}

function calcHeatDuty() {
  const massFlow = parseFloat(document.getElementById("heat-mass-flow").value);
  const massUnit = document.getElementById("heat-mass-unit").value;
  const pIn = parseFloat(document.getElementById("heat-pin").value);
  const xIn = parseFloat(document.getElementById("heat-xin").value);
  const pOut = parseFloat(document.getElementById("heat-pout").value);
  const xOut = parseFloat(document.getElementById("heat-xout").value);
  const pUnit = document.getElementById("heat-p-unit").value;
  const resultEl = document.getElementById("heat-result");

  if ([massFlow, pIn, xIn, pOut, xOut].some(isNaN) || xIn < 0 || xIn > 1 || xOut < 0 || xOut > 1) {
    resultEl.innerHTML = `<p class="error-msg">Enter valid values (quality 0–1).</p>`;
    return;
  }

  const satIn = interpolateByPressure(pressureToBar(pIn, pUnit));
  const satOut = interpolateByPressure(pressureToBar(pOut, pUnit));

  if (!satIn || !satOut) {
    resultEl.innerHTML = `<p class="error-msg">Pressure out of range (0.01–100 bar).</p>`;
    return;
  }

  const hIn = wetSteamProps(satIn, xIn).h;
  const hOut = wetSteamProps(satOut, xOut).h;
  const mDot = toKgPerSec(massFlow, massUnit);
  const qKw = mDot * (hOut - hIn);
  const qKjH = qKw * 3600;
  const qBtuH = qKjH * 0.947817;

  resultEl.innerHTML = `
    <div class="heat-result-grid">
      <div class="heat-result-item">
        <span class="heat-label">Inlet enthalpy (h₁)</span>
        <span class="heat-value">${formatNum(hIn)} kJ/kg</span>
      </div>
      <div class="heat-result-item">
        <span class="heat-label">Outlet enthalpy (h₂)</span>
        <span class="heat-value">${formatNum(hOut)} kJ/kg</span>
      </div>
      <div class="heat-result-item">
        <span class="heat-label">Δh</span>
        <span class="heat-value">${formatNum(hOut - hIn)} kJ/kg</span>
      </div>
      <div class="heat-result-item highlight">
        <span class="heat-label">Heat duty (Q)</span>
        <span class="heat-value">${formatNum(qKw)} kW</span>
      </div>
      <div class="heat-result-item">
        <span class="heat-label">Heat duty</span>
        <span class="heat-value">${formatNum(qKjH)} kJ/h</span>
      </div>
      <div class="heat-result-item">
        <span class="heat-label">Heat duty</span>
        <span class="heat-value">${formatNum(qBtuH)} BTU/h</span>
      </div>
    </div>
  `;
}

document.getElementById("steam-calc-btn").addEventListener("click", calcSteamProperties);
document.getElementById("heat-calc-btn").addEventListener("click", calcHeatDuty);

calcSteamProperties();
