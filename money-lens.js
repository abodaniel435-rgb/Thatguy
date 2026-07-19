const MONEY_LENS_DESTINATIONS = [
    { city: "Lagos", country: "Nigeria", currency: "NGN", symbol: "₦", emoji: "🌴", meal: 4200, ride: 900, coffee: 1800, hotel: 82000, color: "gold" },
    { city: "Dubai", country: "UAE", currency: "AED", symbol: "د.إ", emoji: "🌇", meal: 52, ride: 9, coffee: 24, hotel: 760, color: "cyan" },
    { city: "London", country: "United Kingdom", currency: "GBP", symbol: "£", emoji: "🎡", meal: 19, ride: 3.1, coffee: 4.2, hotel: 175, color: "violet" },
    { city: "Tokyo", country: "Japan", currency: "JPY", symbol: "¥", emoji: "🗼", meal: 1450, ride: 220, coffee: 580, hotel: 19000, color: "pink" },
    { city: "New York", country: "United States", currency: "USD", symbol: "$", emoji: "🗽", meal: 22, ride: 2.9, coffee: 5.7, hotel: 235, color: "blue" },
    { city: "Cape Town", country: "South Africa", currency: "ZAR", symbol: "R", emoji: "⛰", meal: 190, ride: 26, coffee: 42, hotel: 1500, color: "green" }
];

const MONEY_LENS_CURRENCIES = ["USD", "NGN", "GBP", "EUR", "AED", "JPY", "ZAR", "CAD", "AUD", "CNY", "INR"];
let moneyLensResults = [];

function moneyLensFormat(value, currency) {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: currency === "JPY" ? 0 : 2 }).format(value);
}

function getMoneyLensInputCurrency() {
    return JSON.parse(sessionStorage.getItem("currensee_session") || "{}").defaultCurrency || "USD";
}

function populateMoneyLensCurrencies() {
    const select = document.getElementById("lensCurrency");
    if (!select) return;
    const preferred = getMoneyLensInputCurrency();
    select.innerHTML = MONEY_LENS_CURRENCIES.map(code => `<option value="${code}" ${code === preferred ? "selected" : ""}>${code}</option>`).join("");
    document.getElementById("lensCoreCurrency").textContent = preferred;
}

function lensDestinationMarkup(destination, converted) {
    const moments = [
        { label: "local meals", value: converted / destination.meal, icon: "✦" },
        { label: "city rides", value: converted / destination.ride, icon: "→" },
        { label: "coffee stops", value: converted / destination.coffee, icon: "●" }
    ];
    const strongest = moments.reduce((best, moment) => moment.value > best.value ? moment : best);
    return `<article class="lens-destination-card lens-${destination.color}" data-city="${destination.city}">
        <div class="lens-card-top"><span class="lens-city-emoji">${destination.emoji}</span><div><span>${destination.country}</span><h3>${destination.city}</h3></div><span class="lens-currency-pill">${destination.currency}</span></div>
        <div class="lens-local-value">${moneyLensFormat(converted, destination.currency)}</div>
        <p class="lens-value-caption">Your money, in ${destination.city}</p>
        <div class="lens-moments">${moments.map(moment => `<div class="lens-moment ${moment === strongest ? "lens-moment-highlight" : ""}"><span>${moment.icon}</span><strong>${moment.value >= 10 ? Math.floor(moment.value) : moment.value.toFixed(1)}</strong><small>${moment.label}</small></div>`).join("")}</div>
        <div class="lens-hotel-line"><span>or roughly</span><strong>${(converted / destination.hotel).toFixed(1)} hotel nights</strong></div>
    </article>`;
}

function renderMoneyLens(results, sourceAmount, sourceCurrency) {
    const container = document.getElementById("lensDestinations");
    const best = [...results].sort((a, b) => (b.converted / b.destination.meal) - (a.converted / a.destination.meal))[0];
    const bestMeals = Math.floor(best.converted / best.destination.meal);
    const bestRides = Math.floor(best.converted / best.destination.ride);
    const bestCoffees = Math.floor(best.converted / best.destination.coffee);
    container.innerHTML = results.map(({ destination, converted }) => lensDestinationMarkup(destination, converted)).join("");
    document.getElementById("lensRevealTitle").textContent = `${moneyLensFormat(sourceAmount, sourceCurrency)} can create six very different days.`;
    document.getElementById("lensRateText").textContent = `Live snapshot · ${sourceCurrency} sent worldwide`;
    document.getElementById("lensSpotlightText").innerHTML = `In <strong>${best.destination.city}</strong>, your ${moneyLensFormat(sourceAmount, sourceCurrency)} can unlock <span class="lens-spotlight-outcome"><b>${bestMeals}</b> local meals</span><span class="lens-spotlight-outcome"><b>${bestRides}</b> city rides</span><span class="lens-spotlight-outcome"><b>${bestCoffees}</b> coffee stops</span>.`;
    document.getElementById("lensSpotlightMetric").innerHTML = `<span>Best value</span><strong>${best.destination.emoji} ${best.destination.city}</strong>`;
    moneyLensResults = results;
}

async function launchMoneyLens() {
    const amount = Number(document.getElementById("lensAmount").value);
    const source = document.getElementById("lensCurrency").value;
    const button = document.getElementById("lensLaunch");
    const status = document.getElementById("lensStatus");
    if (!Number.isFinite(amount) || amount <= 0) { status.textContent = "Enter an amount greater than zero to begin the journey."; return; }

    button.disabled = true;
    button.classList.add("lens-launching");
    document.querySelector(".lens-orbit").classList.add("lens-travelling");
    document.getElementById("lensCoreAmount").textContent = new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(amount);
    document.getElementById("lensCoreCurrency").textContent = source;
    status.textContent = "Sending your money across six live currency routes…";

    try {
        const results = await Promise.all(MONEY_LENS_DESTINATIONS.map(async destination => {
            const quote = source === destination.currency ? { conversion_result: amount } : await convertCurrencyPair(source, destination.currency, amount);
            return { destination, converted: quote.conversion_result };
        }));
        renderMoneyLens(results, amount, source);
        status.textContent = "Your money has landed. Explore the glowing destinations below.";
        document.querySelector(".lens-reveal").classList.add("lens-reveal-active");
    } catch (error) {
        status.textContent = "We could not reach the live rate service. Please check your connection and try again.";
    } finally {
        button.disabled = false;
        button.classList.remove("lens-launching");
        window.setTimeout(() => document.querySelector(".lens-orbit").classList.remove("lens-travelling"), 1200);
    }
}

function focusMoneyLensDestination(city) {
    document.querySelectorAll(".lens-node, .lens-destination-card").forEach(item => item.classList.toggle("lens-focused", item.dataset.city === city));
    const target = document.querySelector(`.lens-destination-card[data-city="${city}"]`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("DOMContentLoaded", () => {
    populateMoneyLensCurrencies();
    document.getElementById("lensLaunch")?.addEventListener("click", launchMoneyLens);
    document.getElementById("lensAmount")?.addEventListener("keydown", event => { if (event.key === "Enter") launchMoneyLens(); });
    document.querySelectorAll(".lens-node").forEach(node => node.addEventListener("click", () => focusMoneyLensDestination(node.dataset.city)));
    launchMoneyLens();
});
