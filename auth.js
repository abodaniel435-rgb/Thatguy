function loadUsers() {
    return JSON.parse(localStorage.getItem("currensee_users") || "[]");
}

function saveUsers(users) {
    localStorage.setItem("currensee_users", JSON.stringify(users));
}

function normalizeEmail(email) {
    return (email || "").trim().toLowerCase();
}

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isSessionHeartbeatFresh(user) {
    const lastBeat = Number(user?.activeSessionHeartbeat || 0);
    return Boolean(user?.activeSessionId) && Date.now() - lastBeat < 15000;
}

function hideAuthMessages(ids) {
    ids.forEach(id => document.getElementById(id)?.classList.add("d-none"));
}

function showAuthMessage(id, text, className) {
    const box = document.getElementById(id);
    if (!box) return;

    box.className = `alert ${className}`;
    box.innerText = text;
    box.classList.remove("d-none");
}

function setAppSession(user) {
    sessionStorage.setItem("currensee_session", JSON.stringify({
        name: user.name,
        email: user.email,
        defaultCurrency: user.defaultCurrency || "USD",
        plan: user.plan || "free",
        subscriptionActive: Boolean(user.subscriptionActive),
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        sessionId: user.sessionId || null,
        remote: Boolean(user.remote)
    }));
}

const authMessage = localStorage.getItem("currensee_auth_message");
if (authMessage) {
    showAuthMessage("loginError", authMessage, "alert-danger");
    localStorage.removeItem("currensee_auth_message");
}

document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("regName").value.trim();
    const email = normalizeEmail(document.getElementById("regEmail").value);
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    hideAuthMessages(["registerError", "registerSuccess"]);

    if (password.length < 6) {
        showAuthMessage("registerError", "Password must be at least 6 characters.", "alert-danger");
        return;
    }

    if (password !== confirm) {
        showAuthMessage("registerError", "Passwords do not match.", "alert-danger");
        return;
    }

    const useRemote = await CurrenSeeBackend.isAvailable();

    if (useRemote) {
        try {
            const data = await CurrenSeeBackend.register({ name, email, password });
            showAuthMessage("registerSuccess", data.message || "Account created! You can now login.", "alert-success");
            this.reset();

            setTimeout(() => {
                document.getElementById("loginTab").click();
                document.getElementById("loginEmail").value = email;
            }, 1200);
        } catch (error) {
            showAuthMessage("registerError", error.message, "alert-danger");
        }

        return;
    }

    const users = loadUsers();
    if (users.find(u => normalizeEmail(u.email) === email)) {
        showAuthMessage("registerError", "An account with this email already exists.", "alert-danger");
        return;
    }

    users.push({
        name,
        email,
        password,
        defaultCurrency: "USD",
        plan: "free",
        subscriptionActive: false,
        subscriptionExpiresAt: null,
        alerts: [],
        history: [],
        activeSessionId: null,
        passwordUpdatedAt: null
    });

    saveUsers(users);
    showAuthMessage("registerSuccess", "Account created! You can now login.", "alert-success");
    this.reset();

    setTimeout(() => {
        document.getElementById("loginTab").click();
    }, 1500);
});

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = normalizeEmail(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value;

    hideAuthMessages(["loginError", "loginSuccess"]);

    const useRemote = await CurrenSeeBackend.isAvailable();

    if (useRemote) {
        try {
            const data = await CurrenSeeBackend.login({ email, password });
            setAppSession({ ...data.user, remote: true });
            window.location.href = "dashboard.html";
        } catch (error) {
            showAuthMessage("loginError", error.message, "alert-danger");
        }

        return;
    }

    const users = loadUsers();
    const userIndex = users.findIndex(
        u => normalizeEmail(u.email) === email && u.password === password
    );

    if (userIndex === -1) {
        showAuthMessage("loginError", "Invalid email or password. Please try again.", "alert-danger");
        return;
    }

    if (users[userIndex].activeSessionId) {
        if (isSessionHeartbeatFresh(users[userIndex])) {
            showAuthMessage(
                "loginError",
                "This account is already logged in on another active session. Log out there first or wait a few seconds and try again.",
                "alert-danger"
            );
            return;
        }

        users[userIndex].activeSessionId = null;
        users[userIndex].activeSessionHeartbeat = null;
    }

    const sessionId = generateSessionId();
    users[userIndex].activeSessionId = sessionId;
    users[userIndex].activeSessionHeartbeat = Date.now();
    users[userIndex].lastLoginAt = new Date().toLocaleString();
    users[userIndex].plan = users[userIndex].plan || "free";
    users[userIndex].subscriptionActive = Boolean(users[userIndex].subscriptionActive);
    users[userIndex].subscriptionExpiresAt = users[userIndex].subscriptionExpiresAt || null;
    saveUsers(users);

    setAppSession({
        name: users[userIndex].name,
        email: users[userIndex].email,
        defaultCurrency: users[userIndex].defaultCurrency,
        plan: users[userIndex].plan,
        subscriptionActive: users[userIndex].subscriptionActive,
        subscriptionExpiresAt: users[userIndex].subscriptionExpiresAt,
        sessionId,
        remote: false
    });

    window.location.href = "dashboard.html";
});

document.getElementById("resetPasswordForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = normalizeEmail(document.getElementById("resetEmail").value);
    const newPassword = document.getElementById("resetPassword").value;
    const confirmPassword = document.getElementById("resetConfirm").value;

    hideAuthMessages(["resetError", "resetSuccess"]);

    if (newPassword.length < 6) {
        showAuthMessage("resetError", "New password must be at least 6 characters.", "alert-danger");
        return;
    }

    if (newPassword !== confirmPassword) {
        showAuthMessage("resetError", "Passwords do not match.", "alert-danger");
        return;
    }

    const useRemote = await CurrenSeeBackend.isAvailable();

    if (useRemote) {
        try {
            const data = await CurrenSeeBackend.resetPassword({ email, newPassword });
            sessionStorage.removeItem("currensee_session");
            showAuthMessage("resetSuccess", data.message || "Password reset successful.", "alert-success");
            this.reset();

            setTimeout(() => {
                document.getElementById("loginTab").click();
                document.getElementById("loginEmail").value = email;
            }, 1200);
        } catch (error) {
            showAuthMessage("resetError", error.message, "alert-danger");
        }

        return;
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => normalizeEmail(u.email) === email);

    if (userIndex === -1) {
        showAuthMessage("resetError", "No account was found with that email address.", "alert-danger");
        return;
    }

    users[userIndex].password = newPassword;
    users[userIndex].activeSessionId = null;
    users[userIndex].activeSessionHeartbeat = null;
    users[userIndex].passwordUpdatedAt = new Date().toLocaleString();
    saveUsers(users);

    const currentSession = JSON.parse(sessionStorage.getItem("currensee_session"));
    if (currentSession && normalizeEmail(currentSession.email) === email) {
        sessionStorage.removeItem("currensee_session");
    }

    showAuthMessage(
        "resetSuccess",
        "Password reset successful. Any active login for this account has been cleared. You can now log in with your new password.",
        "alert-success"
    );
    this.reset();

    setTimeout(() => {
        document.getElementById("loginTab").click();
        document.getElementById("loginEmail").value = email;
    }, 1200);
});

document.getElementById("goRegister").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("registerTab").click();
});

document.getElementById("goLogin").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("loginTab").click();
});

document.getElementById("goResetPassword").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("resetTab").click();
});

document.getElementById("backToLogin").addEventListener("click", function (e) {
    e.preventDefault();
    document.getElementById("loginTab").click();
});
