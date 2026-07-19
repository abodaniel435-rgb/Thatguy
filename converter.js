// ========================
// CONVERTER PAGE
// ========================
let rateChart = null;
let activeSearchTarget = "convFrom";

function populateDropdowns() {
    if (!document.getElementById("convFrom")) return;

    populateCurrencySelect("convFrom", session?.defaultCurrency || "USD");
    populateCurrencySelect("convTo", "NGN");
    renderCurrencyList(CURRENCIES);
}

function renderCurrencyList(list) {
    const container = document.getElementById("currencyList");
    if (!container) return;

    if (!list.length) {
        container.innerHTML = `
            <div class="currency-empty">
                No currencies matched your search. Try a currency code, currency name, or country.
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(currency => `
        <button class="currency-item" type="button" onclick="applyCurrencySelection('${currency.code}')">
            <span class="currency-symbol">${currency.symbol}</span>
            <div>
                <p class="currency-code">${currency.code}</p>
                <p class="currency-name">${currency.name}</p>
                <p class="currency-country">${currency.country}</p>
            </div>
        </button>
    `).join("");
}

function filterCurrencies(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return CURRENCIES;

    return CURRENCIES.filter(currency =>
        currency.code.toLowerCase().includes(normalized) ||
        currency.name.toLowerCase().includes(normalized) ||
        currency.country.toLowerCase().includes(normalized)
    );
}

function syncSearchInput(inputId, code) {
    const input = document.getElementById(inputId);
    const currency = getCurrencyByCode(code);
    if (!input || !currency) return;

    input.value = `${currency.code} - ${currency.name} (${currency.country})`;
}

function getSuggestionContainerId(selectId) {
    return selectId === "convFrom" ? "fromCurrencySuggestions" : "toCurrencySuggestions";
}

function hideSuggestions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.add("d-none");
    container.innerHTML = "";
}

function renderSearchSuggestions(selectId, matches, query) {
    const container = document.getElementById(getSuggestionContainerId(selectId));
    if (!container) return;

    if (!query.trim()) {
        hideSuggestions(container.id);
        return;
    }

    if (!matches.length) {
        container.innerHTML = `
            <div class="currency-suggestion-empty">
                No matches found for "${query}".
            </div>
        `;
        container.classList.remove("d-none");
        return;
    }

    container.innerHTML = matches.slice(0, 8).map(currency => `
        <button
            type="button"
            class="currency-suggestion-item"
            onclick="selectCurrencyFromSearch('${selectId}', '${currency.code}')"
        >
            <span class="currency-suggestion-code">${currency.code}</span>
            <span class="currency-suggestion-details">
                ${currency.name} - ${currency.country}
            </span>
        </button>
    `).join("");

    container.classList.remove("d-none");
}

function handleCurrencySearch(inputId, selectId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    if (!input || !select) return;

    const matches = filterCurrencies(input.value);
    renderSearchSuggestions(selectId, matches, input.value);
}

function applyCurrencySelection(code) {
    const select = document.getElementById(activeSearchTarget);
    if (!select) return;

    select.value = code;
    if (activeSearchTarget === "convFrom") {
        syncSearchInput("fromCurrencySearch", code);
    } else {
        syncSearchInput("toCurrencySearch", code);
    }
}

function selectCurrencyFromSearch(selectId, code) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.value = code;

    if (selectId === "convFrom") {
        syncSearchInput("fromCurrencySearch", code);
    } else {
        syncSearchInput("toCurrencySearch", code);
    }

    hideSuggestions(getSuggestionContainerId(selectId));
}

function setBitcoinPair(fromCode, toCode) {
    const from = document.getElementById("convFrom");
    const to = document.getElementById("convTo");
    if (!from || !to) return;

    from.value = fromCode;
    to.value = toCode;
    syncSearchInput("fromCurrencySearch", fromCode);
    syncSearchInput("toCurrencySearch", toCode);
    hideSuggestions("fromCurrencySuggestions");
    hideSuggestions("toCurrencySuggestions");
}

document.getElementById("currencySearch")?.addEventListener("input", function () {
    renderCurrencyList(filterCurrencies(this.value));
});

document.getElementById("fromCurrencySearch")?.addEventListener("input", function () {
    activeSearchTarget = "convFrom";
    handleCurrencySearch("fromCurrencySearch", "convFrom");
});

document.getElementById("toCurrencySearch")?.addEventListener("input", function () {
    activeSearchTarget = "convTo";
    handleCurrencySearch("toCurrencySearch", "convTo");
});

document.getElementById("fromCurrencySearch")?.addEventListener("focus", function () {
    activeSearchTarget = "convFrom";
});

document.getElementById("toCurrencySearch")?.addEventListener("focus", function () {
    activeSearchTarget = "convTo";
});

document.getElementById("convFrom")?.addEventListener("change", function () {
    syncSearchInput("fromCurrencySearch", this.value);
    hideSuggestions("fromCurrencySuggestions");
});

document.getElementById("convTo")?.addEventListener("change", function () {
    syncSearchInput("toCurrencySearch", this.value);
    hideSuggestions("toCurrencySuggestions");
});

document.addEventListener("click", event => {
    const fromWrap = document.getElementById("fromCurrencySearch")?.parentElement;
    const toWrap = document.getElementById("toCurrencySearch")?.parentElement;

    if (fromWrap && !fromWrap.contains(event.target)) {
        hideSuggestions("fromCurrencySuggestions");
    }

    if (toWrap && !toWrap.contains(event.target)) {
        hideSuggestions("toCurrencySuggestions");
    }
});

async function convertCurrency() {
    const amount = parseFloat(document.getElementById("convAmount").value);
    const from = document.getElementById("convFrom").value;
    const to = document.getElementById("convTo").value;
    const resultBox = document.getElementById("convResult");
    const resultMain = document.getElementById("resultMain");
    const resultRate = document.getElementById("resultRate");
    const resultTime = document.getElementById("resultTime");

    if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    resultMain.innerText = "Converting...";
    resultBox.classList.remove("d-none");

    try {
        const data = await convertCurrencyPair(from, to, amount);
        const converted = formatCurrencyAmount(data.conversion_result, to);
        const rate = formatCurrencyAmount(data.conversion_rate, to);
        const inverseRate = formatCurrencyAmount(1 / data.conversion_rate, from);

        const fromCurrency = getCurrencyByCode(from);
        const toCurrency = getCurrencyByCode(to);

        resultMain.innerHTML = `
            <span style="color:var(--text-muted)">${formatDisplayAmount(amount, from)}</span>
            <span style="color:var(--text-muted); margin: 0 10px">=</span>
            <span style="color:var(--primary); font-size:1.8rem">${formatDisplayAmount(data.conversion_result, to)}</span>
        `;
        resultRate.innerText = `1 ${from} = ${rate} ${to}  |  1 ${to} = ${inverseRate} ${from}`;
        resultTime.innerText = `Last updated: ${new Date().toLocaleTimeString()}`;

        document.getElementById("rateInfo").innerHTML = `
            <div class="rate-info-item"><span>Base Currency</span><strong>${from} - ${fromCurrency?.name || from}</strong></div>
            <div class="rate-info-item"><span>Target Currency</span><strong>${to} - ${toCurrency?.name || to}</strong></div>
            <div class="rate-info-item"><span>Countries</span><strong>${fromCurrency?.country || "Unknown"} to ${toCurrency?.country || "Unknown"}</strong></div>
            <div class="rate-info-item"><span>Exchange Rate</span><strong>${rate}</strong></div>
            <div class="rate-info-item"><span>Inverse Rate</span><strong>${inverseRate}</strong></div>
            <div class="rate-info-item"><span>Price Source</span><strong>${data.provider || "Live market rate"}</strong></div>
            <div class="rate-info-item"><span>Amount</span><strong>${formatCurrencyAmount(amount, from)} ${from}</strong></div>
            <div class="rate-info-item"><span>Converted</span><strong style="color:var(--success)">${converted} ${to}</strong></div>
            <div class="rate-info-item"><span>Time</span><strong>${new Date().toLocaleString()}</strong></div>
        `;

        saveToHistory({
            from,
            to,
            amount,
            result: `${converted} ${to}`,
            rate,
            date: new Date().toLocaleString()
        });

        drawChart(from, to, data.conversion_rate);
    } catch {
        resultMain.innerText = "Conversion failed. Check your connection or try another currency pair.";
    }
}

function swapCurrencies() {
    const from = document.getElementById("convFrom");
    const to = document.getElementById("convTo");
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    syncSearchInput("fromCurrencySearch", from.value);
    syncSearchInput("toCurrencySearch", to.value);
}

function drawChart(from, to, currentRate) {
    const labels = [];
    const data = [];

    for (let i = 29; i >= 0; i--) {
        const day = new Date();
        day.setDate(day.getDate() - i);
        labels.push(day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }));

        const variation = currentRate * (0.97 + Math.random() * 0.06);
        data.push(parseFloat(variation.toFixed(4)));
    }

    data[data.length - 1] = parseFloat(currentRate.toFixed(4));

    if (rateChart) {
        rateChart.destroy();
    }

    const chartCanvas = document.getElementById("rateChart");
    if (!chartCanvas) return;

    rateChart = new Chart(chartCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: `${from} -> ${to}`,
                data,
                borderColor: "#0a84ff",
                backgroundColor: "rgba(10,132,255,0.1)",
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#8b949e" } }
            },
            scales: {
                x: { ticks: { color: "#8b949e" }, grid: { color: "rgba(255,255,255,0.05)" } },
                y: { ticks: { color: "#8b949e" }, grid: { color: "rgba(255,255,255,0.05)" } }
            }
        }
    });
}

window.addEventListener("load", () => {
    populateDropdowns();
    syncSearchInput("fromCurrencySearch", document.getElementById("convFrom")?.value || "USD");
    syncSearchInput("toCurrencySearch", document.getElementById("convTo")?.value || "NGN");
});
