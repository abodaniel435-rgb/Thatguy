// ========================
// INIT
// ========================
document.getElementById("navUsername").innerText = "User " + session.name.split(" ")[0];
renderPlanBadges();

const RSS_TO_JSON_URL = "https://api.rss2json.com/v1/api.json?rss_url=";
const NEWS_FEEDS = {
    all: "https://news.google.com/rss/search?q=forex+OR+currency+exchange+OR+central+bank&hl=en-US&gl=US&ceid=US:en",
    usd: "https://news.google.com/rss/search?q=US+dollar+OR+Federal+Reserve+forex&hl=en-US&gl=US&ceid=US:en",
    eur: "https://news.google.com/rss/search?q=euro+OR+ECB+forex&hl=en-US&gl=US&ceid=US:en",
    crypto: "https://news.google.com/rss/search?q=bitcoin+OR+ethereum+OR+crypto+market&hl=en-US&gl=US&ceid=US:en",
    africa: "https://news.google.com/rss/search?q=naira+OR+cedi+OR+african+currencies&hl=en-US&gl=US&ceid=US:en"
};

const fallbackArticles = [  
    { title: "Federal Reserve Signals Rate Hold Amid Inflation Concerns", summary: "Fallback article shown when the live news feed is unavailable.", tag: "usd", date: "27 Mar 2026", read: "3 min read", link: "#" },
    { title: "Nigerian Naira Stabilizes Following CBN Policy Reforms", summary: "Fallback article shown when the live news feed is unavailable.", tag: "africa", date: "26 Mar 2026", read: "4 min read", link: "#" },
    { title: "Euro Zone GDP Growth Exceeds Expectations", summary: "Fallback article shown when the live news feed is unavailable.", tag: "eur", date: "25 Mar 2026", read: "3 min read", link: "#" },
    { title: "Bitcoin Rallies as Crypto Markets Recover", summary: "Fallback article shown when the live news feed is unavailable.", tag: "crypto", date: "24 Mar 2026", read: "5 min read", link: "#" }
];

let currentFilter = "all";

function formatNewsDate(dateString) {  
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Latest update";

    return date.toLocaleDateString("en-US", { 
        day: "2-digit",
        month: "short",
        year: "numeric"
    });  
}

function estimateReadTime(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 180));
    return `${minutes} min read`;
}

function normalizeArticle(item, filter) {
    const rawTitle = item.title || "Untitled article";
    const cleanTitle = rawTitle.replace(/\s*-\s*[^-]+$/, "").trim();
    const summary = (item.description || item.contentSnippet || "Open the full story to read more.").replace(/<[^>]+>/g, "").trim();

    return {
        title: cleanTitle,
        summary,
        tag: filter === "all" ? "all" : filter,
        date: formatNewsDate(item.pubDate),
        read: estimateReadTime(summary),
        link: item.link || "#"
    };
}

function renderNews(articles, filter) {
    const tagLabel = filter === "all" ? "LIVE" : filter.toUpperCase();

    document.getElementById("newsGrid").innerHTML = articles.map(article => `
        <article class="news-card">
            <div class="news-tag tag-${article.tag === "all" ? "usd" : article.tag}">${tagLabel}</div>
            <h5 class="news-title">${article.title}</h5>
            <p class="news-summary">${article.summary}</p>
            <div class="news-footer">
                <span>${article.date}</span>
                <span>${article.read}</span>
            </div>
            <a href="${article.link}" class="btn btn-sm btn-outline-primary mt-3" target="_blank" rel="noopener noreferrer">Read full story</a>
        </article>
    `).join("");
}

async function loadLiveNews(filter = "all") {
    const newsGrid = document.getElementById("newsGrid");
    const feedUrl = NEWS_FEEDS[filter] || NEWS_FEEDS.all;

    newsGrid.innerHTML = "<p class='text-muted'>Loading live news...</p>";

    try {
        const res = await fetch(`${RSS_TO_JSON_URL}${encodeURIComponent(feedUrl)}`);
        const data = await res.json();

        if (data.status !== "ok" || !Array.isArray(data.items)) {
            throw new Error("Invalid news response");
        }

        const articles = data.items.slice(0, 8).map(item => normalizeArticle(item, filter));
        renderNews(articles, filter);
    } catch {
        const fallback = filter === "all"
            ? fallbackArticles
            : fallbackArticles.filter(article => article.tag === filter);

        newsGrid.innerHTML = "<p class='text-warning mb-3'>Live news is temporarily unavailable, showing fallback headlines.</p>";
        newsGrid.innerHTML += fallback.map(article => `
            <article class="news-card">
                <div class="news-tag tag-${article.tag}">${article.tag.toUpperCase()}</div>
                <h5 class="news-title">${article.title}</h5>
                <p class="news-summary">${article.summary}</p>
                <div class="news-footer">
                    <span>${article.date}</span>
                    <span>${article.read}</span>
                </div>
            </article>
        `).join("");
    }
}

async function loadMarketOverview() {
    try {
        const res = await fetch(`${BASE_URL}/latest/USD`);   
        const data = await res.json();
        const rates = data.conversion_rates;   

        const pairs = [
            { from: "USD", to: "NGN" },   
            { from: "USD", to: "EUR" },
            { from: "USD", to: "GBP" },   
            { from: "USD", to: "JPY" },
            { from: "EUR", to: "NGN" },
            { from: "GBP", to: "NGN" },
            { from: "USD", to: "CAD" },
            { from: "USD", to: "AUD" }
        ];

        document.getElementById("marketOverview").innerHTML = pairs.map(pair => {
            const rate = (rates[pair.to] / rates[pair.from]).toFixed(4);
            const change = (Math.random() * 2 - 1).toFixed(2);
            const isUp = change > 0;

            return `
                <div class="rate-item">
                    <p class="rate-pair">${pair.from} / ${pair.to}</p>
                    <p class="rate-value">${rate}</p>
                    <p style="font-size:0.75rem; color:${isUp ? "var(--success)" : "var(--danger)"}">
                        ${isUp ? "Up" : "Down"} ${Math.abs(change)}%
                    </p>
                </div>`;
        }).join("");

        document.getElementById("trendUSDNGN").innerText = rates.NGN.toFixed(2);
        document.getElementById("trendEURUSD").innerText = (rates.USD / rates.EUR).toFixed(4);
        document.getElementById("trendGBPUSD").innerText = (rates.USD / rates.GBP).toFixed(4);

        const r1 = (Math.random() * 2 - 1).toFixed(2);
        const r2 = (Math.random() * 2 - 1).toFixed(2);
        const r3 = (Math.random() * 2 - 1).toFixed(2);
        document.getElementById("changeUSDNGN").innerText = (r1 > 0 ? "+" : "") + r1 + "%";
        document.getElementById("changeEURUSD").innerText = (r2 > 0 ? "+" : "") + r2 + "%";
        document.getElementById("changeGBPUSD").innerText = (r3 > 0 ? "+" : "") + r3 + "%";
    } catch {
        document.getElementById("marketOverview").innerHTML =
            "<p style='color:var(--danger)'>Failed to load market data.</p>";
    }
}

document.getElementById("newsFilter").addEventListener("change", function () {
    currentFilter = this.value;
    loadLiveNews(currentFilter); 
});

loadMarketOverview();    
loadLiveNews("all");       
