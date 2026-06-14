const display = document.getElementById("display");
const angleModeEl = document.getElementById("angle-mode");

let currentValue = "0";
let previousValue = "";
let operator = null;
let shouldResetDisplay = false;
let angleMode = "DEG";

function updateDisplay() {
  display.textContent = currentValue;
}

function formatResult(value) {
  if (!isFinite(value)) return "Error";
  return String(parseFloat(value.toPrecision(12)));
}

function getCurrentNumber() {
  return parseFloat(currentValue);
}

function setResult(value) {
  currentValue = formatResult(value);
  shouldResetDisplay = true;
  updateDisplay();
}

function inputNumber(num) {
  if (currentValue === "Error") clear();

  if (shouldResetDisplay) {
    currentValue = num === "." ? "0." : num;
    shouldResetDisplay = false;
  } else if (num === "." && currentValue.includes(".")) {
    return;
  } else if (currentValue === "0" && num !== ".") {
    currentValue = num;
  } else {
    currentValue += num;
  }
  updateDisplay();
}

function inputConstant(name) {
  if (currentValue === "Error") clear();

  const value = name === "pi" ? Math.PI : Math.E;
  currentValue = formatResult(value);
  shouldResetDisplay = true;
  updateDisplay();
}

function inputOperator(op) {
  if (currentValue === "Error") return;

  if (operator && !shouldResetDisplay) {
    calculate();
  }
  previousValue = currentValue;
  operator = op;
  shouldResetDisplay = true;
}

function toRadians(value) {
  return angleMode === "DEG" ? (value * Math.PI) / 180 : value;
}

function applyScientific(fn) {
  if (currentValue === "Error") return;

  const value = getCurrentNumber();
  let result;

  switch (fn) {
    case "sin":
      result = Math.sin(toRadians(value));
      break;
    case "cos":
      result = Math.cos(toRadians(value));
      break;
    case "tan":
      result = Math.tan(toRadians(value));
      break;
    case "log":
      if (value <= 0) {
        currentValue = "Error";
        resetState();
        updateDisplay();
        return;
      }
      result = Math.log10(value);
      break;
    case "ln":
      if (value <= 0) {
        currentValue = "Error";
        resetState();
        updateDisplay();
        return;
      }
      result = Math.log(value);
      break;
    case "sqrt":
      if (value < 0) {
        currentValue = "Error";
        resetState();
        updateDisplay();
        return;
      }
      result = Math.sqrt(value);
      break;
    case "square":
      result = value * value;
      break;
    case "reciprocal":
      if (value === 0) {
        currentValue = "Error";
        resetState();
        updateDisplay();
        return;
      }
      result = 1 / value;
      break;
    case "factorial": {
      if (value < 0 || !Number.isInteger(value) || value > 170) {
        currentValue = "Error";
        resetState();
        updateDisplay();
        return;
      }
      result = 1;
      for (let i = 2; i <= value; i++) result *= i;
      break;
    }
    case "negate":
      result = -value;
      break;
    default:
      return;
  }

  setResult(result);
}

function calculate() {
  if (!operator || previousValue === "" || currentValue === "Error") return;

  const prev = parseFloat(previousValue);
  const curr = parseFloat(currentValue);

  if ((operator === "/" || operator === "^") && curr === 0) {
    currentValue = "Error";
    resetState();
    updateDisplay();
    return;
  }

  let result;
  switch (operator) {
    case "+": result = prev + curr; break;
    case "-": result = prev - curr; break;
    case "*": result = prev * curr; break;
    case "/": result = prev / curr; break;
    case "^": result = Math.pow(prev, curr); break;
    default: return;
  }

  currentValue = formatResult(result);
  operator = null;
  previousValue = "";
  shouldResetDisplay = true;
  updateDisplay();
}

function clear() {
  currentValue = "0";
  resetState();
  updateDisplay();
}

function backspace() {
  if (currentValue === "Error") {
    clear();
    return;
  }

  if (shouldResetDisplay) return;

  if (currentValue.length > 1) {
    currentValue = currentValue.slice(0, -1);
  } else {
    currentValue = "0";
  }
  updateDisplay();
}

function resetState() {
  previousValue = "";
  operator = null;
  shouldResetDisplay = false;
}

function toggleAngleMode() {
  angleMode = angleMode === "DEG" ? "RAD" : "DEG";
  angleModeEl.textContent = angleMode;
  document.querySelectorAll('[data-action="toggle-angle"]').forEach((btn) => {
    btn.textContent = angleMode;
  });
}

function handleAction(action) {
  switch (action) {
    case "clear": clear(); break;
    case "equals": calculate(); break;
    case "backspace": backspace(); break;
    case "toggle-angle": toggleAngleMode(); break;
  }
}

document.querySelector(".calculator").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;

  if (btn.dataset.number !== undefined) {
    inputNumber(btn.dataset.number);
  } else if (btn.dataset.operator) {
    inputOperator(btn.dataset.operator);
  } else if (btn.dataset.scientific) {
    applyScientific(btn.dataset.scientific);
  } else if (btn.dataset.constant) {
    inputConstant(btn.dataset.constant);
  } else if (btn.dataset.action) {
    handleAction(btn.dataset.action);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key >= "0" && e.key <= "9") {
    inputNumber(e.key);
  } else if (e.key === ".") {
    inputNumber(".");
  } else if (e.key === "+" || e.key === "-" || e.key === "*" || e.key === "/") {
    inputOperator(e.key);
  } else if (e.key === "^") {
    inputOperator("^");
  } else if (e.key === "Enter" || e.key === "=") {
    e.preventDefault();
    calculate();
  } else if (e.key === "Escape") {
    clear();
  } else if (e.key === "Backspace") {
    backspace();
  }
});
