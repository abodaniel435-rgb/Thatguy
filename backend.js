const CurrenSeeBackend = (() => {
    let availabilityPromise = null;
    let cachedUser = null;

    function getStoredSession() {
        return JSON.parse(sessionStorage.getItem("currensee_session") || "null");
    }

    function setStoredSession(user) {
        const current = getStoredSession() || {};
        sessionStorage.setItem("currensee_session", JSON.stringify({
            ...current,
            name: user.name,
            email: user.email,
            defaultCurrency: user.defaultCurrency || "USD",
            plan: user.plan || "free",
            subscriptionActive: Boolean(user.subscriptionActive),
            subscriptionExpiresAt: user.subscriptionExpiresAt || null,
            remote: true
        }));
    }

    async function isAvailable() {
        if (!availabilityPromise) {
            availabilityPromise = fetch("api/health.php", { cache: "no-store" })
                .then(async response => {
                    if (!response.ok) return false;
                    const data = await response.json();
                    return Boolean(data?.ok);
                })
                .catch(() => false);
        }

        return availabilityPromise;
    }

    async function request(path, options = {}) {
        const response = await fetch(path, {
            cache: "no-store",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};
        let rawText = "";
        try {
            rawText = await response.text();
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = {};
        }

        if (!response.ok) {
            const error = new Error(data?.message || rawText || "Request failed.");
            error.status = response.status;
            error.payload = data;
            throw error;
        }

        return data;
    }

    async function register(payload) {
        return request("api/register.php", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function login(payload) {
        const data = await request("api/login.php", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        cachedUser = data.user || null;
        if (cachedUser) {
            setStoredSession(cachedUser);
        }

        return data;
    }

    async function resetPassword(payload) {
        return request("api/reset-password.php", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function refreshSessionUser() {
        try {
            const data = await request("api/session.php");
            cachedUser = data.user || null;

            if (cachedUser) {
                setStoredSession(cachedUser);
            }

            return cachedUser;
        } catch (error) {
            if (error.status === 401) {
                cachedUser = null;
                sessionStorage.removeItem("currensee_session");
                return null;
            }

            throw error;
        }
    }

    async function logout() {
        try {
            await request("api/logout.php", { method: "POST" });
        } finally {
            cachedUser = null;
        }
    }

    async function saveHistoryEntry(entry) {
        const data = await request("api/history.php", {
            method: "POST",
            body: JSON.stringify({
                action: "add",
                entry
            })
        });

        cachedUser = data.user || cachedUser;
        return data.user;
    }

    async function clearHistory() {
        const data = await request("api/history.php", {
            method: "POST",
            body: JSON.stringify({ action: "clear" })
        });

        cachedUser = data.user || cachedUser;
        return data.user;
    }

    async function saveAlerts(alerts) {
        const data = await request("api/alerts.php", {
            method: "POST",
            body: JSON.stringify({ alerts })
        });

        cachedUser = data.user || cachedUser;
        return data.user;
    }

    async function initializeProPayment() {
        return request("api/paystack-init.php", { method: "POST" });
    }

    async function verifyProPayment(reference) {
        const data = await request(`api/paystack-verify.php?reference=${encodeURIComponent(reference)}`);
        cachedUser = data.user || cachedUser;
        if (cachedUser) {
            setStoredSession(cachedUser);
        }

        return data;
    }

    function getCachedUser() {
        return cachedUser;
    }

    return {
        isAvailable,
        register,
        login,
        resetPassword,
        refreshSessionUser,
        logout,
        saveHistoryEntry,
        clearHistory,
        saveAlerts,
        initializeProPayment,
        verifyProPayment,
        getCachedUser
    };
})();
