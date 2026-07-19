let allHistory = [];

async function loadHistory() {
    if (window.currenseeReady) {
        await window.currenseeReady;
    }

    if (isRemoteSession()) {
        await refreshRemoteUserCache();
    }

    const user = getCurrentUser();
    const fullHistory = user?.history || [];
    allHistory = getPlanLimitedHistory(fullHistory, user);

    document.getElementById("historyTotal").innerText = allHistory.length;
    document.getElementById("navUsername").innerText = "User " + session.name.split(" ")[0];
    renderPlanBadges();
    renderHistoryPlanNotice(fullHistory, user);

    if (allHistory.length > 0) {
        const last = allHistory[allHistory.length - 1];
        document.getElementById("lastConversion").innerText = last.date;

        const pairs = {};
        allHistory.forEach(item => {
            const pair = `${item.from}->${item.to}`;
            pairs[pair] = (pairs[pair] || 0) + 1;
        });

        const mostUsed = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
        document.getElementById("mostUsedPair").innerText = mostUsed?.[0] || "-";
    } else {
        document.getElementById("mostUsedPair").innerText = "-";
        document.getElementById("lastConversion").innerText = "-";
    }

    renderTable(allHistory);
}

function renderHistoryPlanNotice(fullHistory, user) {
    const notice = document.getElementById("historyPlanNotice");
    if (!notice) return;

    if (isProUser(user)) {
        notice.classList.add("d-none");
        notice.innerHTML = "";
        return;
    }

    notice.innerHTML = `
        <strong>Free plan history limit</strong>
        <span>You can keep your latest ${PLAN_LIMITS.free.history} conversions. Pro unlocks unlimited history and CSV export.</span>
        <a href="pricing.html" class="btn btn-sm btn-primary">Upgrade to Pro</a>
    `;
    notice.classList.remove("d-none");
}

function renderTable(data) {
    const tbody = document.getElementById("historyTableBody");
    const empty = document.getElementById("historyEmpty");

    if (data.length === 0) {
        tbody.innerHTML = "";
        empty.classList.remove("d-none");
        return;
    }

    empty.classList.add("d-none");
    tbody.innerHTML = [...data].reverse().map((entry, index) => `
        <tr>
            <td style="color:var(--text-muted)">${data.length - index}</td>
            <td><span class="currency-badge">${entry.from}</span></td>
            <td><span class="currency-badge">${entry.to}</span></td>
            <td>${entry.amount}</td>
            <td style="color:var(--success); font-weight:600">${entry.result}</td>
            <td style="color:var(--text-muted)">${entry.rate}</td>
            <td style="color:var(--text-muted); font-size:0.82rem">${entry.date}</td>
        </tr>
    `).join("");
}

document.getElementById("historySearch").addEventListener("input", filterHistory);
document.getElementById("historyFilter").addEventListener("change", filterHistory);

function filterHistory() {
    const search = document.getElementById("historySearch").value.toLowerCase();
    const filter = document.getElementById("historyFilter").value;

    const filtered = allHistory.filter(entry => {
        const matchSearch = entry.from.toLowerCase().includes(search) || entry.to.toLowerCase().includes(search);
        const matchFilter = filter === "all" || entry.from === filter || entry.to === filter;
        return matchSearch && matchFilter;
    });

    renderTable(filtered);
}

async function clearHistory() {
    if (!confirm("Are you sure you want to clear all conversion history?")) return;

    if (isRemoteSession()) {
        const updatedUser = await CurrenSeeBackend.clearHistory();
        remoteUserCache = updatedUser;
        syncStoredSessionUserData(updatedUser);
    } else {
        const users = JSON.parse(localStorage.getItem("currensee_users") || "[]");
        const userIndex = users.findIndex(user => user.email === session.email);
        users[userIndex].history = [];
        localStorage.setItem("currensee_users", JSON.stringify(users));
        syncStoredSessionUserData(users[userIndex]);
    }

    allHistory = [];
    renderTable([]);
    document.getElementById("historyTotal").innerText = 0;
    document.getElementById("mostUsedPair").innerText = "-";
    document.getElementById("lastConversion").innerText = "-";
}

function exportHistory() {
    if (!isProUser()) {
        showUpgradeMessage(
            "historyPlanNotice",
            "Export is a Pro feature",
            "Upgrade to export conversion records for reports, business tracking, or accounting."
        );
        return;
    }

    if (allHistory.length === 0) {
        alert("No history to export.");
        return;
    }

    const headers = ["#", "From", "To", "Amount", "Result", "Rate", "Date"];
    const rows = allHistory.map((entry, index) =>
        [index + 1, entry.from, entry.to, entry.amount, entry.result, entry.rate, entry.date].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "currensee_history.csv";
    link.click();
}

window.addEventListener("focus", loadHistory);
loadHistory();
