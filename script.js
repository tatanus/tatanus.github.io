//=============================================================================
// HillbillyStorytime Site Script
// Handles: Navbar injection, active page highlighting, Blog loader, Presentations loader
//=============================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadNavbar();
  loadBlog();
  loadPresentations();
});

//-----------------------------------------------------------------------------
// Load the shared navbar from navbar.html and insert into page
//-----------------------------------------------------------------------------
function loadNavbar() {
  const navContainer = document.getElementById("navbar");
  if (!navContainer) return;

  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      navContainer.innerHTML = html;

      // Highlight the active page
      const current = window.location.pathname.split("/").pop() || "index.html";
      document.querySelectorAll(".navbar a").forEach(link => {
        if (link.getAttribute("href") === current) {
          link.style.textDecoration = "underline";
        }
      });
    })
    .catch(err => {
      console.error("Failed to load navbar:", err);
      navContainer.innerHTML = "<p>[Navigation could not be loaded]</p>";
    });
}

//-----------------------------------------------------------------------------
// Load blog posts from blog/posts.json
//-----------------------------------------------------------------------------
function loadBlog() {
  const blogContainer = document.getElementById("blog-entries");
  if (!blogContainer) return;

  fetch("blog/posts.json")
    .then(response => {
      if (!response.ok) throw new Error("HTTP error " + response.status);
      return response.json();
    })
    .then(posts => {
      posts.forEach(post => {
        const div = document.createElement("div");
        div.innerHTML = `
          <h2><a href="blog/${post.file}">${post.title}</a></h2>
          <p>${post.excerpt}</p>
          <hr>
        `;
        blogContainer.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Failed to load blog posts:", err);
      blogContainer.innerHTML = "<p>Could not load blog posts.</p>";
    });
}

//-----------------------------------------------------------------------------
// Load presentation files from GitHub repo via API
//-----------------------------------------------------------------------------
function loadPresentations() {
  const container = document.getElementById("presentations");
  if (!container) return;

  fetch("https://api.github.com/repos/tatanus/Presentations/contents/")
    .then(res => {
      if (!res.ok) throw new Error("GitHub API error " + res.status);
      return res.json();
    })
    .then(files => {
      // Filter for slide files (PDFs and PowerPoints)
      const slides = files.filter(file =>
        file.name.endsWith(".pdf") || file.name.endsWith(".pptx")
      );

      if (slides.length === 0) {
        container.innerHTML = "<p>No presentations found.</p>";
        return;
      }

      slides.forEach(file => {
        const link = document.createElement("p");
        link.innerHTML = `<a href="${file.download_url}" target="_blank">${file.name}</a>`;
        container.appendChild(link);
      });
    })
    .catch(err => {
      console.error("Failed to load presentations:", err);
      container.innerHTML = "<p>Could not load presentations.</p>";
    });
}
