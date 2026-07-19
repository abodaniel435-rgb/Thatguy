// ========================
// CHECK AUTH ON EVERY PAGE
// ========================
let session = JSON.parse(sessionStorage.getItem("currensee_session") || "null");
let remoteUserCache = null;

function normalizeSessionEmail(email) {
    return (email || "").trim().toLowerCase();
}

function isRemoteSession() {
    return Boolean(session?.remote);
}

function setSession(sessionData) {
    session = sessionData;

    if (sessionData) {
        sessionStorage.setItem("currensee_session", JSON.stringify(sessionData));
    } else {
        sessionStorage.removeItem("currensee_session");
    }
}

function getStoredUsers() {
    return JSON.parse(localStorage.getItem("currensee_users") || "[]");
}

function findSessionUser() {
    if (!session?.email) return null;
    if (isRemoteSession()) return remoteUserCache;

    return getStoredUsers().find(
        user => normalizeSessionEmail(user.email) === normalizeSessionEmail(session.email)
    ) || null;
}

function redirectToLogin(message) {
    if (message) {
        localStorage.setItem("currensee_auth_message", message);
    }
    window.location.href = "index.html";
}

function syncStoredSessionUserData(updatedUser) {
    const currentSession = JSON.parse(sessionStorage.getItem("currensee_session"));
    if (!currentSession || !updatedUser) return;

    setSession({
        ...currentSession,
        name: updatedUser.name,
        email: updatedUser.email,
        defaultCurrency: updatedUser.defaultCurrency,
        plan: updatedUser.plan || "free",
        subscriptionActive: Boolean(updatedUser.subscriptionActive),
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt || null,
        remote: Boolean(currentSession.remote)
    });
}

function touchSessionHeartbeat() {
    if (isRemoteSession()) return;
    if (!session?.email || !session?.sessionId) return;

    const users = getStoredUsers();
    const userIndex = users.findIndex(
        user => normalizeSessionEmail(user.email) === normalizeSessionEmail(session.email)
    );

    if (userIndex === -1) return;
    if (users[userIndex].activeSessionId !== session.sessionId) return;

    users[userIndex].activeSessionHeartbeat = Date.now();
    localStorage.setItem("currensee_users", JSON.stringify(users));
}

function validateCurrentSessionState() {
    if (window.location.href.includes("index.html")) return true;
    if (!session) return false;
    if (isRemoteSession()) return true;

    const activeUser = findSessionUser();
    return Boolean(activeUser && activeUser.activeSessionId && activeUser.activeSessionId === session.sessionId);
}

if (!window.location.href.includes("index.html")) {
    if (!session) {
        redirectToLogin();
    } else if (!validateCurrentSessionState()) {
        sessionStorage.removeItem("currensee_session");
        redirectToLogin("Your session is no longer active. Please log in again.");
    }
}

function handleSessionInvalidation() {
    if (!window.location.href.includes("index.html") && !validateCurrentSessionState()) {
        setSession(null);
        redirectToLogin("Your session ended because this account was logged out or reset elsewhere.");
        return true;
    }
    return false;
}

// ========================
// LOGOUT
// ========================
async function logout() {
    const currentSession = JSON.parse(sessionStorage.getItem("currensee_session"));

    if (isRemoteSession()) {
        try {
            await CurrenSeeBackend.logout();
        } finally {
            setSession(null);
            window.location.href = "index.html";
        }
        return;
    }

    const users = getStoredUsers();

    if (currentSession?.email) {
        const userIndex = users.findIndex(
            user => normalizeSessionEmail(user.email) === normalizeSessionEmail(currentSession.email)
        );

        if (userIndex !== -1 && users[userIndex].activeSessionId === currentSession.sessionId) {
            users[userIndex].activeSessionId = null;
            users[userIndex].activeSessionHeartbeat = null;
            localStorage.setItem("currensee_users", JSON.stringify(users));
        }
    }

    setSession(null);
    window.location.href = "index.html";
}

function initMobileNav() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");

    if (!toggle || !menu) return;

    function closeMenu() {
        menu.classList.remove("nav-menu-open");
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
        const isOpen = menu.classList.toggle("nav-menu-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
    });

    menu.querySelectorAll(".nav-item, .btn-logout").forEach(item => {
        item.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
}

// ========================
// YOUR API KEY
// ========================
const API_KEY = "6438cdb6c7860078959003a7";
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;
const BITCOIN_CODE = "BTC";
const COINGECKO_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=";
const CRYPTOCOMPARE_PRICE_URL = "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=";
const COINBASE_BTC_USD_URL = "https://api.coinbase.com/v2/prices/BTC-USD/spot";
const PLAN_LIMITS = {
    free: {
        history: 5,
        alerts: 2
    },
    pro: {
        history: Infinity,
        alerts: Infinity
    }
};

initMobileNav();
touchSessionHeartbeat();
setInterval(touchSessionHeartbeat, 5000);

async function refreshRemoteUserCache() {
    if (!isRemoteSession()) return null;

    const remoteUser = await CurrenSeeBackend.refreshSessionUser();
    if (!remoteUser) {
        setSession(null);
        redirectToLogin("Your session expired. Please log in again.");
        return null;
    }

    remoteUserCache = remoteUser;
    syncStoredSessionUserData(remoteUser);
    return remoteUser;
}

// ========================
// SHARED CURRENCIES
// ========================
const CURRENCIES = [
    { code: "BTC", name: "Bitcoin", country: "Global crypto asset", symbol: "BTC" },
    { code: "USD", name: "US Dollar", country: "United States", symbol: "$" },
    { code: "EUR", name: "Euro", country: "Eurozone", symbol: "EUR" },
    { code: "GBP", name: "British Pound", country: "United Kingdom", symbol: "GBP" },
    { code: "NGN", name: "Nigerian Naira", country: "Nigeria", symbol: "NGN" },
    { code: "JPY", name: "Japanese Yen", country: "Japan", symbol: "JPY" },
    { code: "CAD", name: "Canadian Dollar", country: "Canada", symbol: "CA$" },
    { code: "AUD", name: "Australian Dollar", country: "Australia", symbol: "A$" },
    { code: "CHF", name: "Swiss Franc", country: "Switzerland", symbol: "CHF" },
    { code: "CNY", name: "Chinese Yuan", country: "China", symbol: "CNY" },
    { code: "INR", name: "Indian Rupee", country: "India", symbol: "INR" },
    { code: "BRL", name: "Brazilian Real", country: "Brazil", symbol: "R$" },
    { code: "MXN", name: "Mexican Peso", country: "Mexico", symbol: "MXN" },
    { code: "ZAR", name: "South African Rand", country: "South Africa", symbol: "ZAR" },
    { code: "GHS", name: "Ghanaian Cedi", country: "Ghana", symbol: "GHS" },
    { code: "KES", name: "Kenyan Shilling", country: "Kenya", symbol: "KES" },
    { code: "EGP", name: "Egyptian Pound", country: "Egypt", symbol: "EGP" },
    { code: "AED", name: "UAE Dirham", country: "United Arab Emirates", symbol: "AED" },
    { code: "SAR", name: "Saudi Riyal", country: "Saudi Arabia", symbol: "SAR" },
    { code: "SGD", name: "Singapore Dollar", country: "Singapore", symbol: "S$" },
    { code: "NZD", name: "New Zealand Dollar", country: "New Zealand", symbol: "NZ$" },
    { code: "KWD", name: "Kuwaiti Dinar", country: "Kuwait", symbol: "KWD" },
    { code: "QAR", name: "Qatari Riyal", country: "Qatar", symbol: "QAR" },
    { code: "BHD", name: "Bahraini Dinar", country: "Bahrain", symbol: "BHD" },
    { code: "OMR", name: "Omani Rial", country: "Oman", symbol: "OMR" },
    { code: "TRY", name: "Turkish Lira", country: "Turkey", symbol: "TRY" },
    { code: "KRW", name: "South Korean Won", country: "South Korea", symbol: "KRW" },
    { code: "SEK", name: "Swedish Krona", country: "Sweden", symbol: "SEK" },
    { code: "NOK", name: "Norwegian Krone", country: "Norway", symbol: "NOK" },
    { code: "DKK", name: "Danish Krone", country: "Denmark", symbol: "DKK" },
    { code: "PLN", name: "Polish Zloty", country: "Poland", symbol: "PLN" },
    { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong", symbol: "HK$" },
    { code: "THB", name: "Thai Baht", country: "Thailand", symbol: "THB" },
    { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia", symbol: "MYR" },
    { code: "PHP", name: "Philippine Peso", country: "Philippines", symbol: "PHP" },
    { code: "RUB", name: "Russian Ruble", country: "Russia", symbol: "RUB" }
];

function getCurrencyByCode(code) {
    return CURRENCIES.find(currency => currency.code === code) || null;
}

function isBitcoinPair(from, to) {
    return from === BITCOIN_CODE || to === BITCOIN_CODE;
}

function formatCurrencyAmount(value, code) {
    if (!Number.isFinite(value)) return "0";

    const maximumFractionDigits = code === BITCOIN_CODE ? 8 : 2;
    const minimumFractionDigits = code === BITCOIN_CODE ? 0 : 2;

    return value.toLocaleString(undefined, {
        minimumFractionDigits,
        maximumFractionDigits
    });
}

function formatDisplayAmount(value, code) {
    const currency = getCurrencyByCode(code);
    const formatted = formatCurrencyAmount(value, code);

    if (code === BITCOIN_CODE) {
        return `${formatted} ${code}`;
    }

    return `${currency && currency.symbol ? currency.symbol : code}${formatted} ${code}`;
}

async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    return res.json();
}

async function fetchUsdToFiatRate(currencyCode) {
    if (currencyCode === "USD") return 1;

    const data = await fetchJson(`${BASE_URL}/latest/USD`);
    const rate = data.conversion_rates && data.conversion_rates[currencyCode];

    if (typeof rate !== "number") {
        throw new Error(`USD pricing is not available for ${currencyCode}`);
    }

    return rate;
}

async function fetchCoinGeckoBitcoinPrice(currencyCode) {
    const fiatCode = currencyCode.toLowerCase();
    const data = await fetchJson(`${COINGECKO_PRICE_URL}${fiatCode}`);
    const price = data && data.bitcoin ? data.bitcoin[fiatCode] : null;

    if (typeof price !== "number") {
        throw new Error(`Bitcoin pricing is not available for ${currencyCode}`);
    }

    return {
        price,
        provider: "CoinGecko Bitcoin market price"
    };
}

async function fetchCryptoCompareBitcoinPrice(currencyCode) {
    const data = await fetchJson(`${CRYPTOCOMPARE_PRICE_URL}${currencyCode}`);
    const price = data ? data[currencyCode] : null;

    if (typeof price !== "number") {
        throw new Error(`Bitcoin pricing is not available for ${currencyCode}`);
    }

    return {
        price,
        provider: "CryptoCompare Bitcoin market price"
    };
}

async function fetchCoinbaseBitcoinPrice(currencyCode) {
    const data = await fetchJson(COINBASE_BTC_USD_URL);
    const usdPrice = data && data.data ? parseFloat(data.data.amount) : NaN;

    if (!Number.isFinite(usdPrice)) {
        throw new Error("Bitcoin USD pricing is not available");
    }

    const usdToFiatRate = await fetchUsdToFiatRate(currencyCode);

    return {
        price: usdPrice * usdToFiatRate,
        provider: "Coinbase BTC/USD plus ExchangeRate-API"
    };
}

async function fetchBitcoinPrice(currencyCode) {
    const providers = [
        fetchCoinGeckoBitcoinPrice,
        fetchCryptoCompareBitcoinPrice,
        fetchCoinbaseBitcoinPrice
    ];

    for (const provider of providers) {
        try {
            return await provider(currencyCode);
        } catch (error) {
            // Try the next market data source for browsers or networks that block one provider.
        }
    }

    throw new Error(`Bitcoin pricing is not available for ${currencyCode}`);
}

async function convertCurrencyPair(from, to, amount = 1) {
    if (from === to) {
        return {
            conversion_result: amount,
            conversion_rate: 1,
            provider: "Internal parity"
        };
    }

    if (isBitcoinPair(from, to)) {
        const fiatCode = from === BITCOIN_CODE ? to : from;
        const bitcoinPriceData = await fetchBitcoinPrice(fiatCode);
        const conversionRate = from === BITCOIN_CODE ? bitcoinPriceData.price : 1 / bitcoinPriceData.price;

        return {
            conversion_result: amount * conversionRate,
            conversion_rate: conversionRate,
            provider: bitcoinPriceData.provider
        };
    }

    const res = await fetch(`${BASE_URL}/pair/${from}/${to}/${amount}`);
    const data = await res.json();

    if (data.result !== "success" || typeof data.conversion_rate !== "number") {
        throw new Error("Failed to fetch exchange rate");
    }

    return {
        ...data,
        provider: "ExchangeRate-API"
    };
}

function populateCurrencySelect(selectId, selectedCode, options = CURRENCIES) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = options.map(currency =>
        `<option value="${currency.code}">${currency.symbol} ${currency.code} - ${currency.name} (${currency.country})</option>`
    ).join("");

    if (selectedCode && options.some(currency => currency.code === selectedCode)) {
        select.value = selectedCode;
    }
}

function filterCurrencies(query) {
    const normalized = (query || "").trim().toLowerCase();
    if (!normalized) return CURRENCIES;

    return CURRENCIES.filter(currency =>
        currency.code.toLowerCase().includes(normalized) ||
        currency.name.toLowerCase().includes(normalized) ||
        currency.country.toLowerCase().includes(normalized)
    );
}

function syncCurrencySearchInput(inputId, code) {
    const input = document.getElementById(inputId);
    const currency = getCurrencyByCode(code);
    if (!input || !currency) return;

    input.value = `${currency.code} - ${currency.name} (${currency.country})`;
}

function getQuickSuggestionContainerId(selectId) {
    return selectId === "quickFrom" ? "quickFromSuggestions" : "quickToSuggestions";
}

function hideQuickSuggestions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.classList.add("d-none");
    container.innerHTML = "";
}

function renderQuickSearchSuggestions(selectId, matches, query) {
    const container = document.getElementById(getQuickSuggestionContainerId(selectId));
    if (!container) return;

    if (!query.trim()) {
        hideQuickSuggestions(container.id);
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
            onclick="selectQuickCurrencyFromSearch('${selectId}', '${currency.code}')"
        >
            <span class="currency-suggestion-code">${currency.code}</span>
            <span class="currency-suggestion-details">${currency.name} - ${currency.country}</span>
        </button>
    `).join("");

    container.classList.remove("d-none");
}

function handleCurrencySearch(inputId, selectId) {
    const input = document.getElementById(inputId);
    const select = document.getElementById(selectId);
    if (!input || !select) return;

    const matches = filterCurrencies(input.value);
    renderQuickSearchSuggestions(selectId, matches, input.value);
}

function selectQuickCurrencyFromSearch(selectId, code) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.value = code;

    if (selectId === "quickFrom") {
        syncCurrencySearchInput("quickFromSearch", code);
    } else {
        syncCurrencySearchInput("quickToSearch", code);
    }

    hideQuickSuggestions(getQuickSuggestionContainerId(selectId));
}

function getCurrentUser() {
    if (!session?.email) return null;
    if (isRemoteSession()) return remoteUserCache;

    const users = JSON.parse(localStorage.getItem("currensee_users") || "[]");
    return users.find(user => user.email === session.email) || null;
}

function normalizeSubscription(user) {
    if (!user) return null;

    const subscriptionActive = Boolean(user.subscriptionActive);
    const subscriptionExpiresAt = user.subscriptionExpiresAt || null;

    return {
        ...user,
        plan: user.plan || "free",
        subscriptionActive,
        subscriptionExpiresAt
    };
}

function isSubscriptionExpired(user) {
    if (!user?.subscriptionExpiresAt) return false;
    return new Date(user.subscriptionExpiresAt).getTime() < Date.now();
}

function isProUser(user = getCurrentUser()) {
    const normalizedUser = normalizeSubscription(user);
    return Boolean(
        normalizedUser &&
        normalizedUser.plan === "pro" &&
        normalizedUser.subscriptionActive &&
        !isSubscriptionExpired(normalizedUser)
    );
}

function getPlanName(user = getCurrentUser()) {
    return isProUser(user) ? "Pro" : "Free";
}

function getPlanLimit(feature, user = getCurrentUser()) {
    return isProUser(user) ? PLAN_LIMITS.pro[feature] : PLAN_LIMITS.free[feature];
}

function getPlanLimitedHistory(history = [], user = getCurrentUser()) {
    if (isProUser(user)) return history;
    return history.slice(-PLAN_LIMITS.free.history);
}

function ensureLocalSubscriptionFields() {
    if (isRemoteSession()) return;

    const users = JSON.parse(localStorage.getItem("currensee_users") || "[]");
    let changed = false;

    const updatedUsers = users.map(user => {
        const normalizedUser = normalizeSubscription(user);
        if (
            user.plan !== normalizedUser.plan ||
            user.subscriptionActive !== normalizedUser.subscriptionActive ||
            user.subscriptionExpiresAt !== normalizedUser.subscriptionExpiresAt
        ) {
            changed = true;
            return normalizedUser;
        }

        return user;
    });

    if (changed) {
        localStorage.setItem("currensee_users", JSON.stringify(updatedUsers));
    }
}

function renderPlanBadges() {
    const user = getCurrentUser();
    const planName = getPlanName(user);

    document.querySelectorAll("[data-plan-name]").forEach(element => {
        element.innerText = planName;
        element.classList.add("plan-badge");
        element.classList.toggle("pro-badge", planName === "Pro");
        element.classList.toggle("free-badge", planName !== "Pro");
    });

    document.querySelectorAll("[data-plan-alert-limit]").forEach(element => {
        const limit = getPlanLimit("alerts", user);
        element.innerText = Number.isFinite(limit) ? limit : "Unlimited";
    });

    document.querySelectorAll("[data-plan-history-limit]").forEach(element => {
        const limit = getPlanLimit("history", user);
        element.innerText = Number.isFinite(limit) ? limit : "Unlimited";
    });
}

function showUpgradeMessage(containerId, title, message) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="pro-lock">
            <strong>${title}</strong>
            <span>${message}</span>
            <a href="pricing.html" class="btn btn-sm btn-primary">View Pro</a>
        </div>
    `;
    container.classList.remove("d-none");
}

function renderRecentHistory(history = []) {
    const historyContainer = document.getElementById("recentHistory");
    if (!historyContainer) return;

    if (!history.length) {
        historyContainer.innerHTML = `<p class="text-muted text-center mt-3">No conversions yet.</p>`;
        return;
    }

    historyContainer.innerHTML = history.map(entry => `
        <div class="history-item">
            <span>${entry.from} -> ${entry.to}</span>
            <span style="color:var(--primary); font-weight:600;">${entry.result}</span>
        </div>
    `).join("");
}

function refreshDashboardStats() {
    const totalConversions = document.getElementById("totalConversions");
    const totalAlerts = document.getElementById("totalAlerts");

    if (!totalConversions || !totalAlerts) return;

    const user = getCurrentUser();
    const visibleHistory = getPlanLimitedHistory(user?.history || [], user);
    totalConversions.innerText = visibleHistory.length || 0;
    totalAlerts.innerText = user?.alerts?.length || 0;
    renderRecentHistory(visibleHistory.slice(-3).reverse());
    renderPlanBadges();
}

async function initializeDashboard() {
    if (isRemoteSession()) {
        await refreshRemoteUserCache();
    }

    const navUsername = document.getElementById("navUsername");
    if (navUsername && session) {
        navUsername.innerText = "User " + session.name.split(" ")[0];
    }

    if (!document.getElementById("welcomeName") || !session) return;

    document.getElementById("welcomeName").innerText = session.name.split(" ")[0];
    document.getElementById("defaultCurrency").innerText = session.defaultCurrency || "USD";
    renderPlanBadges();

    document.getElementById("welcomeDate").innerHTML =
        new Date().toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }) + "<br>" + new Date().toLocaleTimeString();

    populateCurrencySelect("quickFrom", session.defaultCurrency || "USD");
    populateCurrencySelect("quickTo", "NGN");
    syncCurrencySearchInput("quickFromSearch", document.getElementById("quickFrom")?.value || "USD");
    syncCurrencySearchInput("quickToSearch", document.getElementById("quickTo")?.value || "NGN");
    refreshDashboardStats();
    loadPopularRates();
}

// ========================
// POPULAR RATES
// ========================
async function loadPopularRates() {
    const container = document.getElementById("popularRates");
    if (!container) return;

    const pairs = [
        { from: "USD", to: "NGN" },
        { from: "USD", to: "EUR" },
        { from: "USD", to: "GBP" },
        { from: "USD", to: "KWD" },
        { from: "GBP", to: "EUR" },
        { from: "USD", to: "JPY" },
        { from: "EUR", to: "NGN" },
        { from: "USD", to: "CAD" }
    ];

    container.innerHTML = "<p style='color:var(--text-muted)'>Fetching live rates...</p>";

    try {
        const res = await fetch(`${BASE_URL}/latest/USD`);
        const data = await res.json();
        const rates = data.conversion_rates;

        container.innerHTML = pairs.map(pair => `
            <div class="rate-item">
                <p class="rate-pair">${pair.from} / ${pair.to}</p>
                <p class="rate-value">${(rates[pair.to] / rates[pair.from]).toFixed(4)}</p>
            </div>
        `).join("");
    } catch {
        container.innerHTML = "<p style='color:var(--danger)'>Failed to load rates. Check your API key.</p>";
    }
}

// ========================
// QUICK CONVERT
// ========================
async function quickConvert() {
    const amount = parseFloat(document.getElementById("quickAmount").value);
    const from = document.getElementById("quickFrom").value;
    const to = document.getElementById("quickTo").value;
    const resultBox = document.getElementById("quickResult");

    if (!amount || amount <= 0) {
        resultBox.innerText = "Please enter a valid amount.";
        resultBox.classList.remove("d-none");
        return;
    }

    resultBox.innerText = "Converting...";
    resultBox.classList.remove("d-none");

    try {
        const data = await convertCurrencyPair(from, to, amount);
        const converted = formatCurrencyAmount(data.conversion_result, to);
        const rate = formatCurrencyAmount(data.conversion_rate, to);

        resultBox.innerHTML = `
            ${formatDisplayAmount(amount, from)} = <strong>${formatDisplayAmount(data.conversion_result, to)}</strong>
            <br><small style="color:var(--text-muted)">Rate: 1 ${from} = ${rate} ${to}</small>
        `;

        await saveToHistory({
            from,
            to,
            amount,
            result: `${converted} ${to}`,
            rate,
            date: new Date().toLocaleString()
        });
    } catch {
        resultBox.innerText = "Conversion failed. Check your connection.";
    }
}

// ========================
// SAVE TO HISTORY
// ========================
async function saveToHistory(entry) {
    if (isRemoteSession()) {
        const updatedUser = await CurrenSeeBackend.saveHistoryEntry(entry);
        remoteUserCache = updatedUser;
        syncStoredSessionUserData(updatedUser);
        refreshDashboardStats();
        window.dispatchEvent(new CustomEvent("currensee:history-updated", {
            detail: { totalConversions: updatedUser.history.length, entry }
        }));
        return;
    }

    let users = JSON.parse(localStorage.getItem("currensee_users") || "[]");
    const userIndex = users.findIndex(user => user.email === session?.email);

    if (userIndex === -1) return;

    if (!users[userIndex].history) {
        users[userIndex].history = [];
    }

    users[userIndex].history.push(entry);
    if (!isProUser(users[userIndex])) {
        users[userIndex].history = users[userIndex].history.slice(-PLAN_LIMITS.free.history);
    }
    localStorage.setItem("currensee_users", JSON.stringify(users));
    syncStoredSessionUserData(users[userIndex]);

    refreshDashboardStats();
    window.dispatchEvent(new CustomEvent("currensee:history-updated", {
        detail: { totalConversions: users[userIndex].history.length, entry }
    }));
}

window.addEventListener("storage", event => {
    if (event.key === "currensee_users" || event.key === "currensee_session") {
        if (handleSessionInvalidation()) return;
    }

    if (event.key === "currensee_users" || event.key === "currensee_session") {
        refreshDashboardStats();
    }
});

window.currenseeReady = (async () => {
    ensureLocalSubscriptionFields();

    if (isRemoteSession()) {
        const activeRemoteUser = await refreshRemoteUserCache();
        if (!activeRemoteUser) return;
    }

    await initializeDashboard();
})();

document.getElementById("quickFromSearch")?.addEventListener("input", function () {
    handleCurrencySearch("quickFromSearch", "quickFrom");
});

document.getElementById("quickToSearch")?.addEventListener("input", function () {
    handleCurrencySearch("quickToSearch", "quickTo");
});

document.getElementById("quickFrom")?.addEventListener("change", function () {
    syncCurrencySearchInput("quickFromSearch", this.value);
    hideQuickSuggestions("quickFromSuggestions");
});

document.getElementById("quickTo")?.addEventListener("change", function () {
    syncCurrencySearchInput("quickToSearch", this.value);
    hideQuickSuggestions("quickToSuggestions");
});

document.addEventListener("click", event => {
    const quickFromWrap = document.getElementById("quickFromSearch")?.parentElement;
    const quickToWrap = document.getElementById("quickToSearch")?.parentElement;

    if (quickFromWrap && !quickFromWrap.contains(event.target)) {
        hideQuickSuggestions("quickFromSuggestions");
    }

    if (quickToWrap && !quickToWrap.contains(event.target)) {
        hideQuickSuggestions("quickToSuggestions");
    }
});

window.addEventListener("focus", async () => {
    if (!isRemoteSession()) return;

    const remoteUser = await refreshRemoteUserCache();
    if (!remoteUser) return;

    if (document.getElementById("welcomeName")) {
        refreshDashboardStats();
    }
});
