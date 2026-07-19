// ========================
// INIT
// ========================
document.getElementById("navUsername").innerText = "User " + session.name.split(" ")[0];
renderPlanBadges();

async function sendContactRequest(payload) {
    const response = await fetch("api/contact.php", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(data.message || "Message could not be sent.");
    }

    return data;
}

function showFormMessage(element, text, isSuccess = true) {
    element.className = `alert ${isSuccess ? "alert-success" : "alert-danger"}`;
    element.innerText = text;
    element.classList.remove("d-none");
}

// ========================
// HELP SEARCH
// ========================
document.getElementById("helpSearch").addEventListener("input", function() {
    const q = this.value.toLowerCase();
    const items = document.querySelectorAll(".accordion-item");
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(q) ? "block" : "none";
    });
});

// ========================
// STAR RATING
// ========================
let selectedRating = 0;
const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

document.querySelectorAll(".star").forEach(star => {
    star.addEventListener("click", function() {
        selectedRating = parseInt(this.dataset.value, 10);
        document.querySelectorAll(".star").forEach((s, i) => {
            s.style.opacity = i < selectedRating ? "1" : "0.3";
        });
        document.getElementById("ratingText").innerText =
            `You rated us: ${ratingLabels[selectedRating]} (${selectedRating}/5)`;
    });
});

// ========================
// SUPPORT FORM
// ========================
document.getElementById("supportForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("supportName").value.trim();
    const email = document.getElementById("supportEmail").value.trim();
    const category = document.getElementById("supportCategory").value;
    const message = document.getElementById("supportMessage").value.trim();
    const msgBox = document.getElementById("supportMsg");
    const submitButton = this.querySelector("button[type='submit']");

    submitButton.disabled = true;
    submitButton.innerText = "Sending...";

    try {
        await sendContactRequest({
            type: "support",
            name,
            email,
            category,
            message
        });

        showFormMessage(msgBox, `Thanks ${name}! Your support request has been sent. We'll get back to you within 24 hours.`);
        this.reset();
        setTimeout(() => msgBox.classList.add("d-none"), 5000);
    } catch (error) {
        showFormMessage(msgBox, error.message, false);
    } finally {
        submitButton.disabled = false;
        submitButton.innerText = "Submit Request";
    }
});

// ========================
// FEEDBACK FORM
// ========================
document.getElementById("feedbackForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const msgBox = document.getElementById("feedbackMsg");
    const likes = document.getElementById("feedbackLikes").value.trim();
    const improvements = document.getElementById("feedbackImprovements").value.trim();
    const submitButton = this.querySelector("button[type='submit']");

    if (!selectedRating) {
        showFormMessage(msgBox, "Please choose a star rating before submitting feedback.", false);
        return;
    }

    submitButton.disabled = true;
    submitButton.innerText = "Sending...";

    try {
        await sendContactRequest({
            type: "feedback",
            rating: selectedRating,
            likes,
            improvements,
            email: session && session.email ? session.email : ""
        });

        showFormMessage(msgBox, "Thank you for your feedback! It has been sent.");
        this.reset();
        selectedRating = 0;
        document.querySelectorAll(".star").forEach(s => s.style.opacity = "1");
        document.getElementById("ratingText").innerText = "";
        setTimeout(() => msgBox.classList.add("d-none"), 4000);
    } catch (error) {
        showFormMessage(msgBox, error.message, false);
    } finally {
        submitButton.disabled = false;
        submitButton.innerText = "Submit Feedback";
    }
});
