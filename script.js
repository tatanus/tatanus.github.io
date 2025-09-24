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
  document.getElementById("prism-theme-light").disabled = isDark;
  document.getElementById("prism-theme-dark").disabled = !isDark;
}

// ---- Syntax highlighting helper (Prism.js) ----
function highlightCode(container) {
  if (!container) return;
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
      highlightCode(content); // Prism.js highlights everything inside
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

// Load and render README.md from Presentations repo
function loadPresentations() {
  const container = document.getElementById("presentations");
  if (!container) return;

  const readmeUrl = "https://raw.githubusercontent.com/tatanus/Presentations/main/README.md";

  // Use the same safe Marked options as blog posts
  marked.setOptions({
    gfm: true,
    breaks: true,
    langPrefix: "language-",
    mangle: false,
    headerIds: false
  });

  fetch(readmeUrl)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch README.md");
      return res.text();
    })
    .then(md => {
      // ✅ Render directly
      container.innerHTML = marked.parse(md);

      // ✅ Apply Prism highlighting after rendering
      // highlightCode(container);
    })
    .catch(err => {
      console.error("Failed to load presentations README:", err);
      container.innerHTML = "<p>Could not load presentations.</p>";
    });
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

// Main
document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadFooter();
  loadBlog();
  loadPresentations();
  initScrollTop();

  // ✅ Auto-load markdown post if ?file= param exists
  const params = new URLSearchParams(window.location.search);
  const file = params.get("file");
  if (file) {
    renderMarkdown("blog/" + file);
  }
});
