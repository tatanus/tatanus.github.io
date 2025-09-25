// Responsive Navbar (Hamburger toggle)
function initNavbarToggle() {
  const hamburger = document.querySelector(".hamburger");
  const menu = document.querySelector(".menu");
  if (!hamburger || !menu) return;

  hamburger.addEventListener("click", () => {
    menu.classList.toggle("show");
  });
}

// Scroll-to-top button
function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.style.display = window.scrollY > 200 ? "block" : "none";
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Dark mode toggle with icon switch
function initDarkMode() {
  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;

  if (localStorage.getItem("darkmode") === "true") {
    document.body.classList.add("dark");
    toggle.textContent = "☀️";
  } else {
    toggle.textContent = "🌙";
  }

  toggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("darkmode", isDark);
    toggle.textContent = isDark ? "☀️" : "🌙";
    setPrismTheme(isDark);
  });
}

// Load navbar dynamically
function loadNavbar() {
  const navContainer = document.getElementById("navbar");
  if (!navContainer) return;

  fetch("/navbar.html")
    .then(res => res.text())
    .then(html => {
      navContainer.innerHTML = html;

      const current = window.location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".navbar a").forEach(link => {
        const href = link.getAttribute("href").replace(/^\//, "");
        if (href === current) {
          link.classList.add("active");
        }
      });

      initNavbarToggle();
      initDarkMode();
      initSearch();
    })
    .catch(err => {
      console.error("Failed to load navbar:", err);
      navContainer.innerHTML = "<p>[Navigation could not be loaded]</p>";
    });
}

// Blog loader with Markdown rendering
function loadBlog() {
  const blogContainer = document.getElementById("blog-entries");
  if (!blogContainer) return;

  blogContainer.innerHTML = "";

  fetch("blog/posts.json")
    .then(r => {
      if (!r.ok) throw new Error("Failed to fetch posts.json");
      return r.json();
    })
    .then(posts => {
      if (!Array.isArray(posts) || posts.length === 0) {
        blogContainer.innerHTML = "<p>No posts available.</p>";
        return;
      }
      posts.forEach(post => {
        const div = document.createElement("div");
        div.innerHTML = `
          <h2><a href="post.html?file=${post.file}">${post.title}</a></h2>
          <small>${post.date || ""}</small>
          <p>${post.excerpt || ""}</p>
          <a href="post.html?file=${post.file}">Read More</a>
          <hr>
        `;
        blogContainer.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Failed to load blog:", err);
      blogContainer.innerHTML = "<p>Could not load blog posts.</p>";
    });
}

function setPrismTheme(isDark) {
  const light = document.getElementById("prism-theme-light");
  const dark = document.getElementById("prism-theme-dark");
  if (!light || !dark) return;
  light.disabled = isDark;
  dark.disabled = !isDark;
}

// ---- Syntax highlighting helper (Prism.js) ----
function highlightCode(container) {
  if (!container || typeof Prism === "undefined") {
    console.warn("Prism not ready, skipping highlight");
    return;
  }
  Prism.highlightAllUnder(container);
}

// Render Markdown blog post
function renderMarkdown(file) {
  const content = document.getElementById("post-content");
  if (!content) return;

  marked.setOptions({ langPrefix: "language-" });

  fetch(file)
    .then(r => {
      if (!r.ok) throw new Error("Failed to fetch " + file);
      return r.text();
    })
    .then(md => {
      content.innerHTML = marked.parse(md);
      highlightCode(content);
    })
    .catch(err => {
      console.error("Failed to render markdown:", err);
      content.innerHTML = "<p>Could not load post content.</p>";
    });
}

// Blog search with Lunr.js
function initSearch() {
  const searchBox = document.getElementById("searchBox");
  const blogContainer = document.getElementById("blog-entries");
  if (!searchBox || !blogContainer) return;

  let idx, posts = [];

  fetch("blog/posts.json")
    .then(r => r.json())
    .then(data => {
      posts = data;
      idx = lunr(function () {
        this.ref("file");
        this.field("title");
        this.field("excerpt");
        this.field("date");
        data.forEach(doc => this.add(doc));
      });
    });

  searchBox.addEventListener("input", () => {
    const query = searchBox.value.trim();
    if (!idx) return;

    if (!query) {
      blogContainer.innerHTML = "";
      loadBlog();
      return;
    }
    const results = idx.search(query);
    blogContainer.innerHTML = "";
    results.forEach(r => {
      const post = posts.find(p => p.file === r.ref);
      if (post) {
        blogContainer.innerHTML += `
          <h2><a href="blog/${post.file}">${post.title}</a></h2>
          <small>${post.date}</small>
          <p>${post.excerpt}</p>
          <hr>
        `;
      }
    });
  });
}

// ---- Repo Loader with Caching ----
async function loadGitHubRepos() {
  const cacheKey = "reposCache";
  const cacheTimeKey = "reposCacheTime";
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const cached = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);

  if (cached && cachedTime && (now - cachedTime < oneDay)) {
    console.log("Using cached repos");
    renderRepos(JSON.parse(cached));
    return;
  }

  try {
    console.log("Fetching repos from GitHub...");
    const resp = await fetch("https://api.github.com/users/tatanus/repos?per_page=100");
    if (!resp.ok) throw new Error("GitHub API error: " + resp.status);
    const repos = await resp.json();

    localStorage.setItem(cacheKey, JSON.stringify(repos));
    localStorage.setItem(cacheTimeKey, now);

    renderRepos(repos);
  } catch (err) {
    console.error("Error loading repos:", err);
    if (cached) renderRepos(JSON.parse(cached)); // fallback to stale cache
  }
}

function renderRepos(repos) {
  const container = document.getElementById("dynamic-repos");
  if (!container) return;

  // Clear previous
  container.innerHTML = "";

  // Blacklist of exact full_names you don't want shown
  const blacklistFullNames = new Set([
    "tatanus/BABYC2_dev",
    "tatanus/beefapi",
    "tatanus/blackhat-arsenal-tools",
    "tatanus/metagoofil",
    "tatanus/metasploit-framework",
    "tatanus/tatanus.github.io",
    "tatanus/theHarvester"
  ]);

  // Hardcoded Pinned repo names (already displayed in HTML)
  const pinnedRepoNames = new Set([
    "bash_style_guide",
    "common_core",
    "bash_setup",
    "pentest_setup",
    "pentest_menu",
    "pentest_validation",
    "scripts"
  ]);

  // Filter: only skip blacklist + pinned
  const filtered = repos.filter(r => {
    const full = (r.full_name || `${r.owner.login}/${r.name}`);
    if (blacklistFullNames.has(full)) return false;
    if (pinnedRepoNames.has(r.name)) return false;
    return true;
  });

  // Sort by last push (code commit activity)
  filtered.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  
  // Partition into categories
  const newish = [];
  const old = [];
  const unsupported = [];
  
  const now = new Date();
  filtered.forEach(r => {
    const pushed = new Date(r.pushed_at);
    const diffDays = (now - pushed) / (1000 * 60 * 60 * 24);
    const diffMonths = diffDays / 30; // rough month calc
  
    if (r.archived) {
      unsupported.push(r);
      return;
    }
  
    if (diffMonths < 6) {
      newish.push(r);
    } else if (diffMonths < 12) {
      old.push(r);
    } else {
      unsupported.push(r);
    }
  });

  if (newish.length) renderRepoCategory(container, "New-ish (updated < 6 months ago)", newish);
  if (old.length) renderRepoCategory(container, "Old (6 months – 1 year)", old);
  if (unsupported.length) renderRepoCategory(container, "Potentially Unsupported (> 1 year or archived)", unsupported);
}

function renderRepoCategory(container, title, repos) {
  const h = document.createElement("h3");
  h.textContent = title;
  container.appendChild(h);

  const ul = document.createElement("ul");
  ul.classList.add("repo-list");

  repos.forEach(r => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${r.html_url}" target="_blank">${r.name}</a>` +
      (r.description ? ` — ${r.description}` : "");
    ul.appendChild(li);
  });

  container.appendChild(ul);
}

// ---- Presentations Loader with Caching ----
async function loadPresentations() {
  const cacheKey = "presentationsCache";
  const cacheTimeKey = "presentationsCacheTime";
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const cached = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  const container = document.getElementById("presentations");
  if (!container) return;

  if (cached && cachedTime && (now - cachedTime < oneDay)) {
    console.log("Using cached presentations");
    container.innerHTML = marked.parse(cached);
    return;
  }

  try {
    const res = await fetch("https://raw.githubusercontent.com/tatanus/Presentations/main/README.md");
    if (!res.ok) throw new Error("Failed to fetch README.md");
    const md = await res.text();

    localStorage.setItem(cacheKey, md);
    localStorage.setItem(cacheTimeKey, now);

    container.innerHTML = marked.parse(md);
  } catch (err) {
    console.error("Failed to load presentations README:", err);
    if (cached) {
      container.innerHTML = marked.parse(cached);
    } else {
      container.innerHTML = "<p>Could not load presentations.</p>";
    }
  }
}

// Load footer dynamically
function loadFooter() {
  const footerContainer = document.getElementById("footer");
  if (!footerContainer) return;

  fetch("/footer.html")
    .then(res => res.text())
    .then(html => {
      footerContainer.innerHTML = html;
    })
    .catch(err => {
      console.error("Failed to load footer:", err);
      footerContainer.innerHTML = "<p>[Footer could not be loaded]</p>";
    });
}

// ---- Main ----
document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadFooter();
  loadBlog();
  loadPresentations();
  loadGitHubRepos();
  initScrollTop();

  // Auto-load markdown post if ?file= param exists
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");
  if (file) {
    renderMarkdown("blog/" + file);
  }
});
