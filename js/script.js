const apiURL = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies`;

const dropdowns = document.querySelectorAll(".dropdown select");
const fromCurr = document.querySelector(".from select");
const toCurr = document.querySelector(".to select");
const msg = document.querySelector(".msg");
let amount = document.querySelector(".amount input");
let currencyData = {};
const toastBox = document.getElementById("toastBox");
const spinner = document.querySelector(".refreshRates .fa.fa-arrows-rotate");

async function init() {
  for (const select of dropdowns) {
    for (const currCode in countryList) {
      if (!Object.hasOwn(countryList, currCode)) continue;
      let newOption = document.createElement("option");
      newOption.textContent = currCode.toUpperCase();
      newOption.value = currCode;
      if (select.name === "from" && currCode === "usd") {
        newOption.selected = "selected";
      } else if (select.name === "to" && currCode === "ngn") {
        newOption.selected = "selected";
      }
      select.append(newOption);
    }
  }

  for (const currCode in countryList) {
    if (!Object.hasOwn(countryList, currCode)) continue;
    const key = `currency-${currCode}`;
    if (localStorage.getItem(key)) {
      currencyData[currCode.toLowerCase()] = JSON.parse(
        localStorage.getItem(key),
      );
      if (
        Date.now() - new Date(currencyData[currCode.toLowerCase()].date) >=
        86400000
      ) {
        handleRateExchange(currCode, key);
      }
    } else {
      spinner.classList.add("fa-spin");

      spinner.ariaBusy = true;

      await handleRateExchange(currCode, key);
      spinner.classList.remove("fa-spin");

      spinner.ariaBusy = false;
    }
  }
  setLocalStorageItems();
  getExchangeRate();
}

function setLocalStorageItems() {
  if (localStorage.getItem("currentAmount")) {
    amount.value = Number(localStorage.getItem("currentAmount"));
  }

  if (localStorage.getItem("fromCurr")) {
    fromCurr.value = localStorage.getItem("fromCurr");
  }

  if (localStorage.getItem("toCurr")) {
    toCurr.value = localStorage.getItem("toCurr");
  }
}

navigator.onLine
  ? init()
  : localStorage.getItem("usd")
    ? showToast("You are offline and will use cached currency data", "warning")
    : showToast(
        "You are offline and there is no cached data, please connect to the internet to get realtime values",
      );
async function handleRateExchange(currCode, key) {
  try {
    const data = await fetchRates(currCode.toLowerCase());
    if (data) {
      localStorage.setItem(key, JSON.stringify(data));
      currencyData[currCode.toLowerCase()] = data;
    }
  } catch (err) {
    console.error("Failed to fetch rates for", currCode, err);
  }
}

function getAllRates() {
  const promises = [];
  for (let currCode in countryList) {
    if (!Object.hasOwn(countryList, currCode)) continue;
    const key = `currency-${currCode}`;
    promises.push(handleRateExchange(currCode, key));
  }
  return Promise.all(promises);
}

async function fetchRates(currCode) {
  try {
    const response = await fetch(`${apiURL}/${currCode}.json`, {
      method: "GET",
      cache: "no-cache",
    });
    if (response.ok && response.status === 200) {
      showToast("Successfully fetched currency data", "success");
      return await response.json();
    } else {
      showToast(
        "Fetched Currency data is invalid please refresh for better data",
        "warning",
      );
      return null;
    }
  } catch (error) {
    showToast("Failed to fetch currency data", "error");
    console.error("Fetch error:", error);
    throw new Error(error);
  }
}

function getCachedRate(fromCode, toCode) {
  const fromCodeLower = fromCode.toLowerCase();
  const toCodeLower = toCode.toLowerCase();

  const currencyObj = currencyData[fromCodeLower];
  if (!currencyObj) {
    console.warn(`No cached data for ${fromCode}`);
    return null;
  }

  const rates = currencyObj[fromCodeLower];
  if (rates && rates[toCodeLower]) {
    return rates[toCodeLower];
  }

  console.warn(`No rate found for ${fromCode} to ${toCode}`);
  return null;
}

function getExchangeRate() {
  const fromCode = fromCurr.value;
  const toCode = toCurr.value;
  const rate = getCachedRate(fromCode, toCode);
  if (rate === null) {
    showToast(
      "Exchange rate not available, please connect to the internet and try again.",
      "error",
    );
    return;
  }

  const finalAmount = amount.value * rate;
  msg.textContent = `${new Intl.NumberFormat(navigator.language).format(amount.value)} ${fromCode.toUpperCase()} = ${new Intl.NumberFormat(
    navigator.language,
    {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    },
  ).format(finalAmount.toFixed(6))} ${toCode.toUpperCase()}`;
  msg.classList.remove("error");
}

const currencyForm = document.querySelector("form");
async function refreshRates() {
  spinner.classList.add("fa-spin");
  spinner.ariaBusy = true;
  if (amount.value === "" || amount.value < 1) {
    amount.value = "1";
  }
  try {
    await getAllRates();
    getExchangeRate();
  } finally {
    spinner.classList.remove("fa-spin");
    spinner.ariaBusy = false;
  }
}

Array.from(currencyForm.children).forEach((formElement) => {
  formElement.addEventListener("change", (e) => {
    e.preventDefault();
    localStorage.setItem("currentAmount", amount.value);
    if (amount.value === "" || amount.value < 1) {
      amount.value = "1";
    }
    handleFormInput();

    localStorage.setItem("fromCurr", fromCurr.value);
    localStorage.setItem("toCurr", toCurr.value);
  });
});

amount.addEventListener("input", (e) => {
  e.preventDefault();
  localStorage.setItem("currentAmount", amount.value);
  setTimeout(() => {
    handleFormInput();
  }, 300);
});

function handleFormInput() {
  if (amount.value.includes("e")) {
    showToast("Invalid input", "error");
    return;
  }
  getExchangeRate();
}

function swapCurrencies() {
  let currentFrom = fromCurr.value;
  let currentTo = toCurr.value;
  fromCurr.value = currentTo;
  toCurr.value = currentFrom;
  handleFormInput();
}

function showToast(message, id) {
  let toast = document.createElement("div");
  toast.classList.add("toast");
  toast.role = "alert";
  toast.ariaLive = "assertive";
  let messageIcon = document.createElement("span");
  messageIcon.classList.add("fa");
  let messageText = document.createElement("span");
  messageText.textContent = message;
  if (id === "error") {
    toast.ariaLabel = "error";
    toast.classList.add("error");
    messageIcon.classList.add("fa-circle-xmark");
  } else if (id === "success") {
    toast.ariaLabel = "succes";
    toast.classList.add("success");
    messageIcon.classList.add("fa-circle-check");
  } else if (id === "warning") {
    toast.ariaLabel = "Warning";
    toast.classList.add("invalid");
    messageIcon.classList.add("fa-circle-exclamation");
  }
  toast.append(messageIcon, messageText);
  toastBox.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 6000);
}

window.addEventListener("offline", () => {
  showToast("You are offline and will now use cached currency data", "warning");
});

window.addEventListener("online", () => {
  showToast(
    "You are back online and will you now receive realtime data",
    "success",
  );
});
