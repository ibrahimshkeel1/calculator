const display = document.getElementById("display");

let currentValue = "0";
let previousValue = "";
let operator = null;
let shouldResetDisplay = false;

function updateDisplay() {
  display.textContent = currentValue;
}

function inputNumber(num) {
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

function inputOperator(op) {
  if (operator && !shouldResetDisplay) {
    calculate();
  }
  previousValue = currentValue;
  operator = op;
  shouldResetDisplay = true;
}

function calculate() {
  if (!operator || previousValue === "") return;

  const prev = parseFloat(previousValue);
  const curr = parseFloat(currentValue);

  if (operator === "/" && curr === 0) {
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
    default: return;
  }

  currentValue = String(parseFloat(result.toPrecision(12)));
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

function resetState() {
  previousValue = "";
  operator = null;
  shouldResetDisplay = false;
}

function handleAction(action) {
  if (action === "clear") clear();
  else if (action === "equals") calculate();
}

document.querySelector(".buttons").addEventListener("click", (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;

  if (btn.dataset.number !== undefined) {
    inputNumber(btn.dataset.number);
  } else if (btn.dataset.operator) {
    inputOperator(btn.dataset.operator);
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
  } else if (e.key === "Enter" || e.key === "=") {
    e.preventDefault();
    calculate();
  } else if (e.key === "Escape") {
    clear();
  } else if (e.key === "Backspace") {
    if (currentValue.length > 1) {
      currentValue = currentValue.slice(0, -1);
    } else {
      currentValue = "0";
    }
    updateDisplay();
  }
});
