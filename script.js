// Reading or writing localStorage throws in browsers that block site data
// (strict privacy modes, some enterprise policies). Unguarded, that throw
// escaped initDarkMode into loadNavbar's .catch, which replaced the whole
// navigation with "[Navigation could not be loaded]" and skipped initSearch.
const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }
};

// Scroll-to-top button
function initScrollTop() {
  const btn = document.getElementById("scrollTop");
  if (!btn) return;

  // Passive: this listener never calls preventDefault, and marking it so keeps
  // it off the scrolling critical path. Only touch the style when the state
  // actually changes rather than on every scroll event.
  let shown = false;
  window.addEventListener("scroll", () => {
    const shouldShow = window.scrollY > 200;
    if (shouldShow !== shown) {
      shown = shouldShow;
      btn.style.display = shouldShow ? "block" : "none";
    }
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Dark mode toggle with icon switch
function initDarkMode() {
  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;

  const startDark = storage.get("darkmode") === "true";
  document.body.classList.toggle("dark", startDark);
  toggle.textContent = startDark ? "☀️" : "🌙";
  toggle.setAttribute("aria-pressed", String(startDark));
  // Keep the Prism stylesheet in step with the restored theme, otherwise a
  // saved dark preference renders code blocks with the light theme.
  setPrismTheme(startDark);

  toggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    storage.set("darkmode", isDark);
    toggle.textContent = isDark ? "☀️" : "🌙";
    toggle.setAttribute("aria-pressed", String(isDark));
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
          link.setAttribute("aria-current", "page");
        }
      });

      initDarkMode();
      initSearch();
    })
    .catch(err => {
      console.error("Failed to load navbar:", err);
      navContainer.innerHTML = "<p>[Navigation could not be loaded]</p>";
    });
}

// posts.json used to be fetched by loadBlog, again by initSearch, and again on
// every search clear. Fetch it once, share the promise, and sort here so the
// listing and the search agree on order.
let postsPromise = null;
function getPosts() {
  if (!postsPromise) {
    postsPromise = fetch("blog/posts.json")
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch posts.json");
        return r.json();
      })
      .then(posts => {
        if (!Array.isArray(posts)) return [];
        // Newest first; undated entries sort last rather than throwing.
        return posts.slice().sort((a, b) =>
          String(b.date || "").localeCompare(String(a.date || "")));
      });
  }
  return postsPromise;
}

// Markdown is rendered into innerHTML and marked does not sanitise. Post files
// live in this repo and carry the same trust as script.js itself, so they
// render even without the sanitiser; the presentations README is fetched
// cross-origin, so that path refuses to render unsanitised.
function sanitizeMarkdown(html, requireSanitizer) {
  if (typeof DOMPurify !== "undefined") return DOMPurify.sanitize(html);
  if (requireSanitizer) return null;
  console.warn("DOMPurify unavailable; rendering first-party Markdown unsanitised");
  return html;
}

// The page supplies its own <h1>, so remote Markdown that opens with one would
// give the document two top-level headings. Shift everything down a level.
function demoteHeadings(container) {
  for (let level = 5; level >= 1; level--) {
    container.querySelectorAll("h" + level).forEach(el => {
      const repl = document.createElement("h" + (level + 1));
      repl.innerHTML = el.innerHTML;
      Array.from(el.attributes).forEach(a => repl.setAttribute(a.name, a.value));
      el.replaceWith(repl);
    });
  }
}

// Shared post-summary markup. The blog listing and the search results used to
// build this separately and had drifted: search linked straight at the raw .md
// file instead of the post viewer.
function renderPostSummary(post) {
  const wrapper = document.createElement("div");
  const href = "post.html?file=" + encodeURIComponent(post.file);

  const heading = document.createElement("h2");
  const titleLink = document.createElement("a");
  titleLink.href = href;
  titleLink.textContent = post.title || post.file;
  heading.appendChild(titleLink);

  const date = document.createElement("small");
  if (post.date) {
    const stamp = document.createElement("time");
    stamp.setAttribute("datetime", post.date);
    stamp.textContent = post.date;
    date.appendChild(stamp);
  }

  const excerpt = document.createElement("p");
  excerpt.textContent = post.excerpt || "";

  const more = document.createElement("a");
  more.href = href;
  more.textContent = "Read More";

  wrapper.append(heading, date, excerpt, more, document.createElement("hr"));
  return wrapper;
}

// Blog loader with Markdown rendering
function loadBlog() {
  const blogContainer = document.getElementById("blog-entries");
  if (!blogContainer) return;

  blogContainer.innerHTML = "";

  getPosts()
    .then(posts => {
      if (!posts.length) {
        blogContainer.innerHTML = "<p>No posts available.</p>";
        return;
      }
      posts.forEach(post => blogContainer.appendChild(renderPostSummary(post)));
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

// Every post shared one generic <title> and no description, so links to
// individual posts were indistinguishable when shared. Fill both in from the
// posts.json entry once we know which post this is.
function applyPostMetadata(post) {
  const url = location.origin + "/post.html?file=" + encodeURIComponent(post.file);
  document.title = post.title + " — HillbillyStorytime";

  const set = (selector, attr, value) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };
  const desc = post.excerpt || "";
  set('meta[name="description"]', "content", desc);
  set('meta[property="og:title"]', "content", post.title);
  set('meta[property="og:description"]', "content", desc);
  set('meta[property="og:url"]', "content", url);
  set('meta[name="twitter:title"]', "content", post.title);
  set('meta[name="twitter:description"]', "content", desc);
  set('link[rel="canonical"]', "href", url);
}

// Render Markdown blog post
function renderMarkdown(file) {
  const content = document.getElementById("post-content");
  if (!content) return;

  marked.setOptions({ langPrefix: "language-" });

  getPosts()
    .then(posts => {
      // Only render files listed in posts.json. Without this, ?file= will
      // fetch and render any same-origin path the caller names.
      const post = posts.find(p => p.file === file);
      if (!post) throw new Error("Unknown post: " + file);
      return fetch("blog/" + post.file).then(r => {
        if (!r.ok) throw new Error("Failed to fetch " + post.file);
        return r.text().then(md => ({ md, post }));
      });
    })
    .then(({ md, post }) => {
      content.innerHTML = sanitizeMarkdown(marked.parse(md), false);
      highlightCode(content);
      applyPostMetadata(post);
    })
    .catch(err => {
      console.error("Failed to render markdown:", err);
      content.innerHTML = "<p>Could not load post content.</p>";
    });
}

// Blog search with Lunr.js
function initSearch() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  const blogContainer = document.getElementById("blog-entries");
  if (!blogContainer) {
    // The navbar is shared, but search only has anything to search on the blog
    // index. Hide the input rather than leaving a dead control on every page.
    searchBox.hidden = true;
    return;
  }

  let idx, posts = [];

  getPosts()
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
    if (!results.length) {
      blogContainer.innerHTML = "<p>No posts match that search.</p>";
      return;
    }
    results.forEach(r => {
      const post = posts.find(p => p.file === r.ref);
      if (post) blogContainer.appendChild(renderPostSummary(post));
    });
  });
}

// ---- Repo Loader with Caching ----
async function loadGitHubRepos() {
  // Only the development page renders repos. Bail out before spending one of
  // the 60 unauthenticated GitHub API calls per hour on every other page.
  if (!document.getElementById("dynamic-repos")) return;

  const cacheKey = "reposCache";
  const cacheTimeKey = "reposCacheTime";
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();

  const cached = storage.get(cacheKey);
  const cachedTime = storage.get(cacheTimeKey);

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

    storage.set(cacheKey, JSON.stringify(repos));
    storage.set(cacheTimeKey, now);

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

  // Derived from the static markup rather than duplicated here, so adding or
  // renaming a pinned repo in the HTML can no longer make it appear twice.
  const pinnedRepoNames = new Set(
    Array.from(document.querySelectorAll(".repo-list a"))
      .filter(a => !container.contains(a))
      .map(a => (a.getAttribute("href") || "").replace(/\/+$/, "").split("/").pop())
      .filter(Boolean)
  );

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
  // h2, matching "Pinned Repos" — the page previously jumped h1 -> h3.
  const h = document.createElement("h2");
  h.textContent = title;
  container.appendChild(h);

  const ul = document.createElement("ul");
  ul.classList.add("repo-list");

  repos.forEach(r => {
    // Built as DOM nodes rather than innerHTML: the name and description come
    // from the GitHub API, and these links also need the same rel as the
    // static ones.
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = r.html_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = r.name;
    li.appendChild(a);
    if (r.description) li.appendChild(document.createTextNode(" — " + r.description));
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

  const cached = storage.get(cacheKey);
  const cachedTime = storage.get(cacheTimeKey);
  const container = document.getElementById("presentations");
  if (!container) return;

  if (cached && cachedTime && (now - cachedTime < oneDay)) {
    console.log("Using cached presentations");
    renderPresentations(container, cached);
    return;
  }

  try {
    const res = await fetch("https://raw.githubusercontent.com/tatanus/Presentations/main/README.md");
    if (!res.ok) throw new Error("Failed to fetch README.md");
    const md = await res.text();

    storage.set(cacheKey, md);
    storage.set(cacheTimeKey, now);

    renderPresentations(container, md);
  } catch (err) {
    console.error("Failed to load presentations README:", err);
    if (cached) {
      renderPresentations(container, cached);
    } else {
      container.innerHTML = "<p>Could not load presentations.</p>";
    }
  }
}

// This Markdown is fetched cross-origin from raw.githubusercontent.com, so it
// is rendered only through the sanitiser.
function renderPresentations(container, md) {
  const safe = sanitizeMarkdown(marked.parse(md), true);
  if (safe === null) {
    container.innerHTML = "<p>Could not render presentations (sanitizer unavailable).</p>";
    return;
  }
  container.innerHTML = safe;
  demoteHeadings(container);
}

// Load footer dynamically
function loadFooter() {
  const footerContainer = document.getElementById("footer");
  if (!footerContainer) return;

  fetch("/footer.html")
    .then(res => res.text())
    .then(html => {
      footerContainer.innerHTML = html;

      const year = footerContainer.querySelector("#copyright-year");
      if (year) year.textContent = new Date().getFullYear();
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
    renderMarkdown(file);
  }
});
