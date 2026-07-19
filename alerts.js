document.getElementById("navUsername").innerText = "User " + session.name.split(" ")[0];
renderPlanBadges();

const NOTIFICATION_CHECK_INTERVAL_MS = 60000;

function getUser() {
    return getCurrentUser();
}

function getAlertTypeLabel(type) {
    return type === "above" ? "Rise to" : "Drop to";
}

function getAlertTypeFromRate(currentRate, targetRate) {
    return targetRate >= currentRate ? "above" : "below";
}

async function fetchPairRate(from, to) {
    try {
        const data = await convertCurrencyPair(from, to);
        return data.conversion_rate;
    } catch (error) {
        if (from === BITCOIN_CODE || to === BITCOIN_CODE) {
            throw error;
        }

        const res = await fetch(`${BASE_URL}/latest/USD`);
        const data = await res.json();
        const rates = data.conversion_rates || {};
        const fromRate = rates[from];
        const toRate = rates[to];

        if (typeof fromRate !== "number" || typeof toRate !== "number") {
            throw error;
        }

        return toRate / fromRate;
    }
}

async function saveAlerts(alerts) {
    if (isRemoteSession()) {
        const updatedUser = await CurrenSeeBackend.saveAlerts(alerts);
        remoteUserCache = updatedUser;
        syncStoredSessionUserData(updatedUser);
        return;
    }

    const users = JSON.parse(localStorage.getItem("currensee_users") || "[]");
    const idx = users.findIndex(user => user.email === session.email);
    if (idx === -1) {
        throw new Error("Your session could not be found. Please log in again.");
    }

    users[idx].alerts = alerts;
    localStorage.setItem("currensee_users", JSON.stringify(users));
    syncStoredSessionUserData(users[idx]);
}

function canUseBrowserNotifications() {
    return "Notification" in window && window.isSecureContext;
}

function updateNotificationStatus() {
    const status = document.getElementById("notificationStatus");
    const button = document.getElementById("enableNotificationsBtn");
    if (!status || !button) return;

    if (!("Notification" in window)) {
        status.innerText = "This browser does not support notifications. Keep this page open for popup alerts.";
        button.classList.add("d-none");
        return;
    }

    if (!window.isSecureContext) {
        status.innerText = "Notifications need HTTPS. They will work on your live website, not from a local file.";
        button.classList.add("d-none");
        return;
    }

    if (Notification.permission === "granted") {
        status.innerText = "Notifications are enabled. Keep this page or the app running to receive rate alerts.";
        button.classList.add("d-none");
        return;
    }

    if (Notification.permission === "denied") {
        status.innerText = "Notifications are blocked. Enable them in your browser or app settings.";
        button.classList.add("d-none");
        return;
    }

    status.innerText = "Enable notifications so CurrenSee can tell you when a rate hits your target.";
    button.classList.remove("d-none");
}

async function requestAlertNotifications() {
    if (!canUseBrowserNotifications()) {
        updateNotificationStatus();
        return false;
    }

    const permission = await Notification.requestPermission();
    updateNotificationStatus();
    return permission === "granted";
}

function showInlineAlertMessage(message, type = "success") {
    const msgBox = document.getElementById("alertMsg");
    if (!msgBox) return;

    msgBox.className = `mt-3 alert alert-${type}`;
    msgBox.innerText = message;
    msgBox.classList.remove("d-none");
}

function playAlertSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
    } catch {
        // Sound is only a bonus; notification still matters.
    }
}

function notifyAlertTriggered(alertItem, currentRateDisplay) {
    const direction = alertItem.type === "above" ? "risen to" : "dropped to";
    const title = `CurrenSee alert: ${alertItem.from} -> ${alertItem.to}`;
    const body = `${alertItem.from}/${alertItem.to} has ${direction} ${alertItem.targetRate}. Current rate: ${currentRateDisplay}`;

    playAlertSound();
    document.title = "Alert Triggered - CurrenSee";

    if (canUseBrowserNotifications() && Notification.permission === "granted") {
        const notification = new Notification(title, {
            body,
            icon: "images/currensee-app-icon-1024.png",
            badge: "images/currensee-app-icon-1024.png",
            tag: `currensee-${alertItem.from}-${alertItem.to}-${alertItem.targetRate}`,
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } else {
        alert(`Alert Triggered!\n${body}`);
    }

    showInlineAlertMessage(body);
}

async function refreshAlerts() {
    if (window.currenseeReady) {
        await window.currenseeReady;
    }

    if (isRemoteSession()) {
        await refreshRemoteUserCache();
    }

    const user = getUser();
    const alerts = user?.alerts || [];
    await checkAlerts(alerts);
}

async function loadAlerts() {
    if (window.currenseeReady) {
        await window.currenseeReady;
    }

    if (isRemoteSession()) {
        await refreshRemoteUserCache();
    }

    const user = getUser();
    const alerts = user?.alerts || [];
    renderPlanBadges();
    renderAlertPlanNotice(alerts, user);

    document.getElementById("summaryTotal").innerText = alerts.length;
    document.getElementById("summaryActive").innerText = alerts.filter(alert => alert.status === "active").length;
    document.getElementById("summaryTriggered").innerText = alerts.filter(alert => alert.status === "triggered").length;

    const container = document.getElementById("alertsList");
    const empty = document.getElementById("alertsEmpty");

    if (alerts.length === 0) {
        container.innerHTML = "";
        empty.classList.remove("d-none");
        return;
    }

    empty.classList.add("d-none");
    container.innerHTML = alerts.map((alertItem, index) => `
        <div class="alert-item ${alertItem.status === "triggered" ? "alert-triggered" : ""}">
            <div class="alert-pair">
                <span class="currency-badge">${alertItem.from}</span>
                <span style="color:var(--text-muted); margin: 0 8px">-></span>
                <span class="currency-badge">${alertItem.to}</span>
            </div>
            <div class="alert-details">
                <p>Target: <strong>${getAlertTypeLabel(alertItem.type)} ${alertItem.targetRate}</strong></p>
                <p style="font-size:0.78rem; color:var(--text-muted)">Created: ${alertItem.date}</p>
            </div>
            <div class="alert-status">
                <span class="status-badge ${alertItem.status === "triggered" ? "status-triggered" : "status-active"}">
                    ${alertItem.status === "triggered" ? "Triggered" : "Active"}
                </span>
            </div>
            <button class="btn-delete" type="button" onclick="deleteAlert(${index})" data-alert-index="${index}" aria-label="Delete ${alertItem.from} to ${alertItem.to} alert">Delete</button>
        </div>
    `).join("");

    checkAlerts(alerts);
}

function renderAlertPlanNotice(alerts, user) {
    const notice = document.getElementById("alertPlanNotice");
    if (!notice) return;

    if (isProUser(user)) {
        notice.classList.add("d-none");
        notice.innerHTML = "";
        return;
    }

    const activeCount = alerts.filter(alert => alert.status === "active").length;
    notice.innerHTML = `
        <strong>Free plan alert limit</strong>
        <span>You can run ${activeCount}/${PLAN_LIMITS.free.alerts} active alerts. Pro unlocks unlimited currency and Bitcoin alerts.</span>
        <a href="pricing.html" class="btn btn-sm btn-primary">Upgrade to Pro</a>
    `;
    notice.classList.remove("d-none");
}

async function createAlert() {
    const from = document.getElementById("alertFrom").value;
    const to = document.getElementById("alertTo").value;
    const rate = parseFloat(document.getElementById("alertRate").value);
    const msgBox = document.getElementById("alertMsg");

    if (!rate || rate <= 0) {
        msgBox.className = "mt-3 alert alert-danger";
        msgBox.innerText = "Please enter a valid target rate.";
        msgBox.classList.remove("d-none");
        return;
    }

    if (from === to) {
        msgBox.className = "mt-3 alert alert-danger";
        msgBox.innerText = "From and To currencies cannot be the same.";
        msgBox.classList.remove("d-none");
        return;
    }

    const user = getUser();
    const alerts = [...(user?.alerts || [])];
    const activeAlerts = alerts.filter(alert => alert.status === "active");

    if (!isProUser(user) && activeAlerts.length >= PLAN_LIMITS.free.alerts) {
        msgBox.className = "mt-3 alert alert-warning";
        msgBox.innerHTML = `Free users can run ${PLAN_LIMITS.free.alerts} active alerts. <a href="pricing.html">Upgrade to Pro</a> for unlimited currency and Bitcoin alerts.`;
        msgBox.classList.remove("d-none");
        renderAlertPlanNotice(alerts, user);
        return;
    }

    let currentRate = 0;
    let type = "above";
    let rateMessage = "The live rate could not be checked right now, so this alert was saved as a rise-to target.";

    if ("Notification" in window && Notification.permission === "default") {
        requestAlertNotifications();
    }

    try {
        currentRate = await fetchPairRate(from, to);
        type = getAlertTypeFromRate(currentRate, rate);
        rateMessage = `Current rate is ${formatCurrencyAmount(currentRate, to)}. You will be notified when ${from}/${to} ${type === "above" ? "rises to" : "drops to"} ${rate}.`;
    } catch (error) {
        currentRate = 0;
    }

    try {

        alerts.push({
            from,
            to,
            targetRate: rate,
            type,
            status: "active",
            date: new Date().toLocaleString(),
            createdAtRate: currentRate
        });

        await saveAlerts(alerts);

        msgBox.className = "mt-3 alert alert-success";
        msgBox.innerText = `Alert set. ${rateMessage}`;
        msgBox.classList.remove("d-none");

        document.getElementById("alertRate").value = "";
        setTimeout(() => msgBox.classList.add("d-none"), 3000);

        loadAlerts();
    } catch (error) {
        msgBox.className = "mt-3 alert alert-danger";
        msgBox.innerText = error.message || "Could not save this alert. Please try again.";
        msgBox.classList.remove("d-none");
    }
}

async function deleteAlert(index) {
    const msgBox = document.getElementById("alertMsg");

    try {
        const user = getUser();
        const alerts = [...(user?.alerts || [])];

        if (!Number.isInteger(index) || index < 0 || index >= alerts.length) {
            throw new Error("This alert could not be found. Refresh the page and try again.");
        }

        alerts.splice(index, 1);
        await saveAlerts(alerts);
        await loadAlerts();

        if (msgBox) {
            msgBox.className = "mt-3 alert alert-success";
            msgBox.innerText = "Alert deleted.";
            msgBox.classList.remove("d-none");
            setTimeout(() => msgBox.classList.add("d-none"), 2500);
        }
    } catch (error) {
        if (msgBox) {
            msgBox.className = "mt-3 alert alert-danger";
            msgBox.innerText = error.message || "Could not delete this alert. Please try again.";
            msgBox.classList.remove("d-none");
        } else {
            alert(error.message || "Could not delete this alert. Please try again.");
        }
    }
}

async function checkCurrentRate() {
    const from = document.getElementById("alertFrom").value;
    const to = document.getElementById("alertTo").value;
    const display = document.getElementById("currentRateDisplay");
    const text = document.getElementById("rateDisplayText");

    text.innerText = "Fetching rate...";
    display.classList.remove("d-none");

    try {
        const rate = formatCurrencyAmount(await fetchPairRate(from, to), to);
        text.innerHTML = `<strong style="color:var(--primary); font-size:1.3rem">1 ${from} = ${rate} ${to}</strong><br>
        <small style="color:var(--text-muted)">Updated: ${new Date().toLocaleTimeString()}</small>`;
    } catch {
        text.innerText = "Failed to fetch rate.";
    }
}

async function checkAlerts(alerts) {
    if (alerts.length === 0) return;
    const activeAlerts = alerts.filter(alert => alert.status === "active");
    if (activeAlerts.length === 0) return;

    try {
        let triggered = false;
        for (const alertItem of activeAlerts) {
            const currentRate = await fetchPairRate(alertItem.from, alertItem.to);
            const currentRateDisplay = formatCurrencyAmount(currentRate, alertItem.to);

            if (alertItem.type === "above" && currentRate >= alertItem.targetRate) {
                alertItem.status = "triggered";
                triggered = true;
                notifyAlertTriggered(alertItem, currentRateDisplay);
            } else if (alertItem.type === "below" && currentRate <= alertItem.targetRate) {
                alertItem.status = "triggered";
                triggered = true;
                notifyAlertTriggered(alertItem, currentRateDisplay);
            }
        }

        if (triggered) {
            await saveAlerts(alerts);
            loadAlerts();
        }
    } catch {
        // Silent fail
    }
}

populateCurrencySelect("alertFrom", session?.defaultCurrency || "USD");
populateCurrencySelect("alertTo", "NGN");
updateNotificationStatus();
loadAlerts();
setInterval(refreshAlerts, NOTIFICATION_CHECK_INTERVAL_MS);
window.addEventListener("focus", refreshAlerts);
document.getElementById("enableNotificationsBtn")?.addEventListener("click", requestAlertNotifications);

document.getElementById("alertsList")?.addEventListener("click", event => {
    let button = event.target;
    while (button && button !== event.currentTarget && !button.dataset.alertIndex) {
        button = button.parentElement;
    }

    if (!button || !button.dataset.alertIndex) return;

    const index = Number(button.dataset.alertIndex);
    if (!Number.isInteger(index)) return;

    deleteAlert(index);
});
