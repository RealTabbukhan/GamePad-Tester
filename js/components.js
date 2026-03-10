/* ========================================
   GPad Tester — Shared Component Behaviors
   Header & Footer HTML is now static in each page.
   This file handles interactivity only:
   - Google Analytics
   - Active nav highlighting
   - Theme toggle icon sync
   - Hamburger menu toggle
   ======================================== */

// ---- Google Analytics (gtag.js) ----
const gtagScript = document.createElement("script");
gtagScript.async = true;
gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-TDF65XQP4B";
document.head.appendChild(gtagScript);

window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-TDF65XQP4B");

(function () {
  "use strict";

  // ---- Active nav highlighting ----
  const path = window.location.pathname;

  function isActive(href) {
    if (href === "/") return path === "/" || path === "/index.html";
    return path.startsWith(href);
  }

  // Highlight active top-level nav links
  document.querySelectorAll(".header__nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    if (href && isActive(href)) {
      link.classList.add("header__nav-link--active");
    }
  });

  // Highlight the dropdown toggle if we're on the homepage
  const dropdownToggle = document.querySelector(".header__dropdown-toggle");
  if (dropdownToggle && (path === "/" || path === "/index.html")) {
    dropdownToggle.classList.add("header__nav-link--active");
  }
})();
