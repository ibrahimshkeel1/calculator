const categories = {
  volumetricFlow: {
    label: "Volumetric Flow Rate",
    units: {
      "m³/s": 1,
      "m³/h": 1 / 3600,
      "m³/min": 1 / 60,
      "L/s": 0.001,
      "L/min": 0.001 / 60,
      "L/h": 0.001 / 3600,
      "GPM": 0.003785411784 / 60,
      "gal/h": 0.003785411784 / 3600,
      "ft³/s": 0.028316846592,
      "ft³/min": 0.028316846592 / 60,
      "bbl/day": 0.158987294928 / 86400,
    },
  },
  massFlow: {
    label: "Mass Flow Rate",
    units: {
      "kg/s": 1,
      "kg/h": 1 / 3600,
      "kg/min": 1 / 60,
      "g/s": 0.001,
      "lb/s": 0.45359237,
      "lb/h": 0.45359237 / 3600,
      "lb/min": 0.45359237 / 60,
      "ton/h": 1000 / 3600,
    },
  },
  molarFlow: {
    label: "Molar Flow Rate",
    units: {
      "mol/s": 1,
      "mol/min": 1 / 60,
      "mol/h": 1 / 3600,
      "kmol/s": 1000,
      "kmol/h": 1000 / 3600,
      "kmol/min": 1000 / 60,
      "lbmol/s": 453.59237,
      "lbmol/h": 453.59237 / 3600,
    },
  },
  density: {
    label: "Density",
    units: {
      "kg/m³": 1,
      "g/cm³": 1000,
      "g/L": 1,
      "g/mL": 1000,
      "lb/ft³": 16.018463374,
      "lb/gal": 119.826427,
      "lb/in³": 27679.90471,
    },
  },
  dynamicViscosity: {
    label: "Dynamic Viscosity",
    units: {
      "Pa·s": 1,
      "mPa·s": 0.001,
      "cP": 0.001,
      "P": 0.1,
      "lb/(ft·s)": 1.48816394,
      "lb/(ft·h)": 1.48816394 / 3600,
    },
  },
  kinematicViscosity: {
    label: "Kinematic Viscosity",
    units: {
      "m²/s": 1,
      "mm²/s": 1e-6,
      "cSt": 1e-6,
      "St": 1e-4,
      "ft²/s": 0.09290304,
    },
  },
  pressure: {
    label: "Pressure",
    units: {
      "Pa": 1,
      "kPa": 1000,
      "bar": 100000,
      "atm": 101325,
      "psi": 6894.757293168,
      "mmHg": 133.322387415,
      "torr": 133.322387415,
      "in H₂O": 249.08891,
      "ft H₂O": 2988.98,
      "in Hg": 3386.389,
    },
  },
  heatTransferCoeff: {
    label: "Heat Transfer Coefficient",
    units: {
      "W/(m²·K)": 1,
      "kW/(m²·K)": 1000,
      "cal/(s·cm²·°C)": 41868,
      "BTU/(h·ft²·°F)": 5.678263,
    },
  },
  thermalConductivity: {
    label: "Thermal Conductivity",
    units: {
      "W/(m·K)": 1,
      "BTU/(h·ft·°F)": 1.730735,
      "cal/(s·cm·°C)": 418.4,
    },
  },
  specificHeat: {
    label: "Specific Heat Capacity",
    units: {
      "J/(kg·K)": 1,
      "kJ/(kg·K)": 1000,
      "cal/(g·°C)": 4184,
      "BTU/(lb·°F)": 4186.8,
    },
  },
  specificEnthalpy: {
    label: "Specific Enthalpy / Energy",
    units: {
      "J/kg": 1,
      "kJ/kg": 1000,
      "cal/g": 4184,
      "BTU/lb": 2326,
      "kcal/kg": 4184,
    },
  },
  molarConcentration: {
    label: "Molar Concentration",
    units: {
      "mol/m³": 1,
      "mol/L": 1000,
      "M": 1000,
      "kmol/m³": 1000,
      "mmol/L": 1,
      "lbmol/ft³": 16018.463,
    },
  },
  diffusivity: {
    label: "Diffusivity",
    units: {
      "m²/s": 1,
      "cm²/s": 1e-4,
      "mm²/s": 1e-6,
      "ft²/s": 0.09290304,
      "ft²/h": 0.09290304 / 3600,
    },
  },
  surfaceTension: {
    label: "Surface Tension",
    units: {
      "N/m": 1,
      "mN/m": 0.001,
      "dyn/cm": 0.001,
      "lb/ft": 14.5939,
    },
  },
  permeability: {
    label: "Permeability",
    units: {
      "m²": 1,
      "cm²": 1e-4,
      "Darcy": 9.869233e-13,
      "mD": 9.869233e-16,
    },
  },
  massFlux: {
    label: "Mass Flux",
    units: {
      "kg/(m²·s)": 1,
      "kg/(m²·h)": 1 / 3600,
      "lb/(ft²·h)": 0.45359237 / 0.09290304 / 3600,
      "g/(cm²·s)": 10,
    },
  },
};

const categorySelect = document.getElementById("category");
const fromValueInput = document.getElementById("from-value");
const toValueInput = document.getElementById("to-value");
const fromUnitSelect = document.getElementById("from-unit");
const toUnitSelect = document.getElementById("to-unit");
const swapBtn = document.getElementById("swap-btn");
const formulaEl = document.getElementById("formula");

function populateCategories() {
  categorySelect.innerHTML = Object.entries(categories)
    .map(([key, cat]) => `<option value="${key}">${cat.label}</option>`)
    .join("");
}

function populateUnits(categoryKey) {
  const units = Object.keys(categories[categoryKey].units);
  const options = units.map((u) => `<option value="${u}">${u}</option>`).join("");
  fromUnitSelect.innerHTML = options;
  toUnitSelect.innerHTML = options;
  toUnitSelect.selectedIndex = Math.min(1, units.length - 1);
}

function formatNumber(value) {
  if (!isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs < 0.0001 || abs >= 1e12) return value.toExponential(6);
  return parseFloat(value.toPrecision(10)).toString();
}

function convert() {
  const categoryKey = categorySelect.value;
  const category = categories[categoryKey];
  const fromUnit = fromUnitSelect.value;
  const toUnit = toUnitSelect.value;
  const input = parseFloat(fromValueInput.value);

  if (isNaN(input)) {
    toValueInput.value = "";
    formulaEl.textContent = "";
    return;
  }

  const base = input * category.units[fromUnit];
  const result = base / category.units[toUnit];

  toValueInput.value = formatNumber(result);
  formulaEl.textContent = `${formatNumber(input)} ${fromUnit} = ${formatNumber(result)} ${toUnit}`;
}

function swapUnits() {
  const fromIndex = fromUnitSelect.selectedIndex;
  fromUnitSelect.selectedIndex = toUnitSelect.selectedIndex;
  toUnitSelect.selectedIndex = fromIndex;

  const fromVal = fromValueInput.value;
  fromValueInput.value = toValueInput.value || fromVal;
  convert();
}

categorySelect.addEventListener("change", () => {
  populateUnits(categorySelect.value);
  convert();
});

fromValueInput.addEventListener("input", convert);
fromUnitSelect.addEventListener("change", convert);
toUnitSelect.addEventListener("change", convert);
swapBtn.addEventListener("click", swapUnits);

populateCategories();
populateUnits(categorySelect.value);
convert();
