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

// ── Unit systems ──────────────────────────────────────────────
// Pressure: base = bar
const P_TO_BAR = {
  bar: 1,
  Pa: 1e-5,
  kPa: 0.01,
  MPa: 10,
  atm: 1.01325,
  psi: 0.0689475729,
  psf: 0.0004788026,
  "in Hg": 0.0338639,
  mmHg: 0.00133322,
  torr: 0.00133322,
  "in H₂O": 0.00249089,
  "ft H₂O": 0.0298907,
};

const PRESSURE_UNITS = ["bar", "Pa", "kPa", "MPa", "atm", "psi", "psf", "in Hg", "mmHg", "in H₂O", "ft H₂O"];

const P_FROM_BAR = {
  Pa: (v) => v * 1e5,
  kPa: (v) => v * 100,
  bar: (v) => v,
  MPa: (v) => v * 0.1,
  atm: (v) => v / 1.01325,
  psi: (v) => v / 0.0689475729,
  psf: (v) => v / 0.0004788026,
  "in Hg": (v) => v / 0.0338639,
  mmHg: (v) => v / 0.00133322,
  torr: (v) => v / 0.00133322,
  "in H₂O": (v) => v / 0.00249089,
  "ft H₂O": (v) => v / 0.0298907,
};

// Temperature: base = °C
const T_TO_C = {
  "°C": (v) => v,
  K: (v) => v - 273.15,
  "°F": (v) => (v - 32) * (5 / 9),
  "°R": (v) => (v - 491.67) * (5 / 9),
};

const TEMP_UNITS = ["°C", "K", "°F", "°R"];

const T_FROM_C = {
  "°C": (v) => v,
  K: (v) => v + 273.15,
  "°F": (v) => v * (9 / 5) + 32,
  "°R": (v) => (v + 273.15) * (9 / 5),
};

// Enthalpy: base = kJ/kg
const H_FROM_KJKG = {
  "J/kg": (v) => v * 1000,
  "kJ/kg": (v) => v,
  "MJ/kg": (v) => v / 1000,
  "BTU/lb": (v) => v / 2.326,
  "cal/g": (v) => v / 4.1868,
  "kcal/kg": (v) => v / 4.1868,
};

// Specific volume: base = m³/kg
const V_FROM_M3KG = {
  "m³/kg": (v) => v,
  "L/kg": (v) => v * 1000,
  "cm³/g": (v) => v * 1000,
  "ft³/lb": (v) => v / 0.06242796,
  "gal/lb": (v) => v / 0.0083454,
  "in³/lb": (v) => v / 0.000036127,
};

// Entropy: base = kJ/(kg·K)
const S_FROM_KJKGK = {
  "J/(kg·K)": (v) => v * 1000,
  "kJ/(kg·K)": (v) => v,
  "BTU/(lb·°F)": (v) => v / 4.1868,
  "cal/(g·°C)": (v) => v / 4.1868,
};

// Mass flow: base = kg/s
const MASS_TO_KGS = {
  "kg/s": 1,
  "kg/h": 1 / 3600,
  "g/s": 0.001,
  "lb/s": 0.45359237,
  "lb/h": 0.45359237 / 3600,
  "lb/min": 0.45359237 / 60,
  "ton/h": 1000 / 3600,
};

// Heat duty: base = kW
const Q_FROM_KW = {
  W: (v) => v * 1000,
  kW: (v) => v,
  MW: (v) => v / 1000,
  "J/s": (v) => v * 1000,
  "kJ/h": (v) => v * 3600,
  "MJ/h": (v) => v * 3.6,
  "BTU/h": (v) => v * 3412.142,
  "BTU/min": (v) => v * 56.869,
  "BTU/s": (v) => v * 0.947817,
  hp: (v) => v / 0.7457,
};

function formatNum(value, digits = 4) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs < 0.0001 || abs >= 1e6) return value.toExponential(4);
  return parseFloat(value.toPrecision(digits)).toString();
}

function formatUnitGroup(units, baseValue, converters) {
  return units
    .map((u) => `<span class="unit-chip">${formatNum(converters[u](baseValue))} <em>${u}</em></span>`)
    .join("");
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

function pressureToBar(value, unit) {
  return value * P_TO_BAR[unit];
}

function toKgPerSec(massFlow, unit) {
  return massFlow * MASS_TO_KGS[unit];
}

const SI_PRESSURE = ["Pa", "kPa", "bar", "MPa"];
const BRITISH_PRESSURE = ["psi", "psf", "atm", "in Hg", "mmHg", "in H₂O", "ft H₂O"];
const SI_TEMP = ["°C", "K"];
const BRITISH_TEMP = ["°F", "°R"];
const SI_ENTHALPY = ["J/kg", "kJ/kg", "MJ/kg"];
const BRITISH_ENTHALPY = ["BTU/lb", "cal/g", "kcal/kg"];
const SI_VOLUME = ["m³/kg", "L/kg", "cm³/g"];
const BRITISH_VOLUME = ["ft³/lb", "gal/lb", "in³/lb"];
const SI_ENTROPY = ["J/(kg·K)", "kJ/(kg·K)"];
const BRITISH_ENTROPY = ["BTU/(lb·°F)", "cal/(g·°C)"];
const SI_HEAT = ["W", "kW", "MW", "J/s", "kJ/h", "MJ/h"];
const BRITISH_HEAT = ["BTU/h", "BTU/min", "BTU/s", "hp"];

function buildRow(label, siUnits, britUnits, baseValue, converter) {
  return `<tr>
    <td>${label}</td>
    <td class="unit-cell">${formatUnitGroup(siUnits, baseValue, converter)}</td>
    <td class="unit-cell">${formatUnitGroup(britUnits, baseValue, converter)}</td>
  </tr>`;
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
    sat = interpolateByPressure(pressureToBar(value, unit));
  } else {
    sat = interpolateByTemperature(T_TO_C[unit](value));
  }

  if (!sat) {
    tbody.innerHTML = `<tr><td colspan="3" class="error-msg">Out of range (0.01–100 bar / ~7–311 °C).</td></tr>`;
    return;
  }

  const props = wetSteamProps(sat, quality);
  const phase = quality === 0 ? "Saturated liquid" : quality === 1 ? "Saturated vapor" : `Wet steam (x = ${quality})`;

  let html = buildRow("Saturation pressure", SI_PRESSURE, BRITISH_PRESSURE, sat.p, P_FROM_BAR);
  html += buildRow("Saturation temperature", SI_TEMP, BRITISH_TEMP, sat.T, T_FROM_C);
  html += `<tr><td>Phase</td><td colspan="2" class="phase-cell">${phase}</td></tr>`;
  html += buildRow("Specific enthalpy (h)", SI_ENTHALPY, BRITISH_ENTHALPY, props.h, H_FROM_KJKG);
  html += buildRow("Saturated liquid enthalpy (hf)", SI_ENTHALPY, BRITISH_ENTHALPY, sat.hf, H_FROM_KJKG);
  html += buildRow("Saturated vapor enthalpy (hg)", SI_ENTHALPY, BRITISH_ENTHALPY, sat.hg, H_FROM_KJKG);
  html += buildRow("Latent heat (hfg)", SI_ENTHALPY, BRITISH_ENTHALPY, props.hfg, H_FROM_KJKG);
  html += buildRow("Specific volume (v)", SI_VOLUME, BRITISH_VOLUME, props.v, V_FROM_M3KG);
  html += buildRow("Saturated liquid volume (vf)", SI_VOLUME, BRITISH_VOLUME, sat.vf, V_FROM_M3KG);
  html += buildRow("Saturated vapor volume (vg)", SI_VOLUME, BRITISH_VOLUME, sat.vg, V_FROM_M3KG);
  html += buildRow("Specific entropy (s)", SI_ENTROPY, BRITISH_ENTROPY, props.s, S_FROM_KJKGK);
  html += buildRow("Saturated liquid entropy (sf)", SI_ENTROPY, BRITISH_ENTROPY, sat.sf, S_FROM_KJKGK);
  html += buildRow("Saturated vapor entropy (sg)", SI_ENTROPY, BRITISH_ENTROPY, sat.sg, S_FROM_KJKGK);

  tbody.innerHTML = html;
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
  const deltaH = hOut - hIn;
  const mDot = toKgPerSec(massFlow, massUnit);
  const qKw = mDot * deltaH;

  const enthalpySi = formatUnitGroup(SI_ENTHALPY, hIn, H_FROM_KJKG);
  const enthalpyBritish = formatUnitGroup(BRITISH_ENTHALPY, hIn, H_FROM_KJKG);
  const enthalpyOutSi = formatUnitGroup(SI_ENTHALPY, hOut, H_FROM_KJKG);
  const enthalpyOutBritish = formatUnitGroup(BRITISH_ENTHALPY, hOut, H_FROM_KJKG);
  const deltaHSi = formatUnitGroup(SI_ENTHALPY, deltaH, H_FROM_KJKG);
  const deltaHBritish = formatUnitGroup(BRITISH_ENTHALPY, deltaH, H_FROM_KJKG);
  const heatSi = formatUnitGroup(SI_HEAT, qKw, Q_FROM_KW);
  const heatBritish = formatUnitGroup(BRITISH_HEAT, qKw, Q_FROM_KW);

  resultEl.innerHTML = `
    <div class="heat-units-block">
      <h3 class="heat-block-title">Inlet enthalpy (h₁)</h3>
      <div class="heat-units-row"><span class="heat-system-label">SI</span><div class="unit-cell">${enthalpySi}</div></div>
      <div class="heat-units-row"><span class="heat-system-label">British</span><div class="unit-cell">${enthalpyBritish}</div></div>
    </div>
    <div class="heat-units-block">
      <h3 class="heat-block-title">Outlet enthalpy (h₂)</h3>
      <div class="heat-units-row"><span class="heat-system-label">SI</span><div class="unit-cell">${enthalpyOutSi}</div></div>
      <div class="heat-units-row"><span class="heat-system-label">British</span><div class="unit-cell">${enthalpyOutBritish}</div></div>
    </div>
    <div class="heat-units-block">
      <h3 class="heat-block-title">Δh</h3>
      <div class="heat-units-row"><span class="heat-system-label">SI</span><div class="unit-cell">${deltaHSi}</div></div>
      <div class="heat-units-row"><span class="heat-system-label">British</span><div class="unit-cell">${deltaHBritish}</div></div>
    </div>
    <div class="heat-units-block highlight">
      <h3 class="heat-block-title">Heat duty (Q)</h3>
      <div class="heat-units-row"><span class="heat-system-label">SI</span><div class="unit-cell">${heatSi}</div></div>
      <div class="heat-units-row"><span class="heat-system-label">British</span><div class="unit-cell">${heatBritish}</div></div>
    </div>
  `;
}

document.getElementById("steam-calc-btn").addEventListener("click", calcSteamProperties);
document.getElementById("heat-calc-btn").addEventListener("click", calcHeatDuty);

calcSteamProperties();
