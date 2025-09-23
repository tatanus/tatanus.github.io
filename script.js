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

// Blog loader with Markdown rendering
function loadBlog() {
  const blogContainer = document.getElementById("blog-entries");
  if (!blogContainer) return;

  fetch("blog/posts.json")
    .then(r => r.json())
    .then(posts => {
      posts.forEach(post => {
        const div = document.createElement("div");
        div.innerHTML = `
          <h2><a href="blog/${post.file}">${post.title}</a></h2>
          <small>${post.date}</small>
          <p>${post.excerpt}</p>
          <a href="blog/${post.file}">Read More</a>
          <hr>
        `;
        blogContainer.appendChild(div);
      });
    });
}

// Render Markdown posts
function renderMarkdown(file) {
  fetch(file)
    .then(r => r.text())
    .then(md => {
      const content = document.getElementById("post-content");
      content.innerHTML = marked.parse(md);
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
    if (!query) {
      blogContainer.innerHTML = "";
      loadBlog();
      return;
    }
    const results = idx.search(query);
    blogContainer.innerHTML = "";
    results.forEach(r => {
      const post = posts.find(p => p.file === r.ref);
      blogContainer.innerHTML += `
        <h2><a href="blog/${post.file}">${post.title}</a></h2>
        <small>${post.date}</small>
        <p>${post.excerpt}</p>
        <hr>
      `;
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadBlog();
  loadPresentations();
  initNavbarToggle();
  initScrollTop();
  initDarkMode();
  initSearch();
});
