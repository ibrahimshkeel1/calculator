const categories = {
  length: {
    label: "Length",
    units: {
      m: 1,
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      mi: 1609.344,
      yd: 0.9144,
      ft: 0.3048,
      in: 0.0254,
      nm: 1852,
    },
  },
  mass: {
    label: "Mass / Weight",
    units: {
      kg: 1,
      g: 0.001,
      mg: 0.000001,
      lb: 0.45359237,
      oz: 0.028349523125,
      ton: 1000,
      st: 6.35029318,
    },
  },
  temperature: {
    label: "Temperature",
    units: { C: "C", F: "F", K: "K" },
  },
  volume: {
    label: "Volume",
    units: {
      L: 1,
      mL: 0.001,
      "m³": 1000,
      gal: 3.785411784,
      qt: 0.946352946,
      pt: 0.473176473,
      cup: 0.2365882365,
      "fl oz": 0.0295735295625,
    },
  },
  area: {
    label: "Area",
    units: {
      "m²": 1,
      "km²": 1000000,
      "cm²": 0.0001,
      "ft²": 0.09290304,
      "in²": 0.00064516,
      acre: 4046.8564224,
      hectare: 10000,
    },
  },
  speed: {
    label: "Speed",
    units: {
      "m/s": 1,
      "km/h": 0.2777777778,
      mph: 0.44704,
      knot: 0.5144444444,
    },
  },
  time: {
    label: "Time",
    units: {
      s: 1,
      min: 60,
      hr: 3600,
      day: 86400,
      week: 604800,
      month: 2629800,
      year: 31557600,
    },
  },
  data: {
    label: "Digital Storage",
    units: {
      B: 1,
      KB: 1024,
      MB: 1048576,
      GB: 1073741824,
      TB: 1099511627776,
    },
  },
  energy: {
    label: "Energy",
    units: {
      J: 1,
      kJ: 1000,
      cal: 4.184,
      kcal: 4184,
      Wh: 3600,
      kWh: 3600000,
    },
  },
  pressure: {
    label: "Pressure",
    units: {
      Pa: 1,
      kPa: 1000,
      bar: 100000,
      psi: 6894.757293168,
      atm: 101325,
      mmHg: 133.322387415,
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

function toCelsius(value, unit) {
  if (unit === "C") return value;
  if (unit === "F") return (value - 32) * (5 / 9);
  return value - 273.15;
}

function fromCelsius(value, unit) {
  if (unit === "C") return value;
  if (unit === "F") return value * (9 / 5) + 32;
  return value + 273.15;
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

  let result;

  if (categoryKey === "temperature") {
    result = fromCelsius(toCelsius(input, fromUnit), toUnit);
  } else {
    const base = input * category.units[fromUnit];
    result = base / category.units[toUnit];
  }

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
