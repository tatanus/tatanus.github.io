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

// Dark mode toggle
function initDarkMode() {
  const toggle = document.getElementById("darkToggle");
  if (!toggle) return;

  if (localStorage.getItem("darkmode") === "true") {
    document.body.classList.add("dark");
  }

  toggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkmode", document.body.classList.contains("dark"));
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

      // Highlight active page
      const current = window.location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".navbar a").forEach(link => {
        const href = link.getAttribute("href").replace(/^\//, "");
        if (href === current) {
          link.classList.add("active");
        }
      });

      // Init features that depend on navbar being loaded
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
          <h2><a href="blog/${post.file}">${post.title}</a></h2>
          <small>${post.date || ""}</small>
          <p>${post.excerpt || ""}</p>
          <a href="blog/${post.file}">Read More</a>
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

// Render Markdown blog post
function renderMarkdown(file) {
  const content = document.getElementById("post-content");
  if (!content) return;

  fetch(file)
    .then(r => {
      if (!r.ok) throw new Error("Failed to fetch " + file);
      return r.text();
    })
    .then(md => {
      content.innerHTML = marked.parse(md);
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
    if (!idx) return; // index not ready yet

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

  // Use raw.githubusercontent.com to fetch Markdown directly
  const readmeUrl = "https://raw.githubusercontent.com/tatanus/Presentations/main/README.md";

  fetch(readmeUrl)
    .then(res => {
      if (!res.ok) throw new Error("Failed to fetch README.md");
      return res.text();
    })
    .then(md => {
      // Convert Markdown to HTML
      container.innerHTML = marked.parse(md);
    })
    .catch(err => {
      console.error("Failed to load presentations README:", err);
      container.innerHTML = "<p>Could not load presentations.</p>";
    });
}

// Main
document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadBlog();
  loadPresentations();
  initScrollTop();
});
