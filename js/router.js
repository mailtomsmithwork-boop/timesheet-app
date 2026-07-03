// Hash-based routing — required on GitHub Pages since there's no server-side
// rewrite/fallback for History-API routing (a refresh on e.g. /dashboard would 404).
const routes = {
  "#/": renderHome,
  "#/recordings": renderRecordings,
  "#/new-entry": renderNewEntry,
  "#/remove-entry": renderRemoveEntry,
  "#/dashboard": renderDashboard,
  "#/archives": renderArchives,
  "#/settings": renderSettings,
  "#/about": renderAbout,
};

function setActiveNavLink(hash) {
  document.querySelectorAll("#sidebar a[data-route], #bottomNav a[data-route]").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-route") === hash);
  });
}

async function router() {
  const hash = window.location.hash || "#/";
  const renderFn = routes[hash] || renderHome;
  setActiveNavLink(routes[hash] ? hash : "#/");
  document.body.classList.remove("more-drawer-open");

  const app = document.getElementById("app");
  app.innerHTML = '<div class="loading">Loading…</div>';
  try {
    await renderFn(app);
  } catch (err) {
    showToast(err.message, "error");
    app.innerHTML = '<div class="error-panel">' + err.message + "</div>";
  }
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initBottomNav();
  router();
});

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("sidebarToggle");
  const collapsed = localStorage.getItem("ts_sidebar_collapsed") === "true";
  document.body.classList.toggle("sidebar-collapsed", collapsed);

  toggle.addEventListener("click", () => {
    const isCollapsed = document.body.classList.toggle("sidebar-collapsed");
    localStorage.setItem("ts_sidebar_collapsed", String(isCollapsed));
  });
}

// On phone widths (see the 720px breakpoint in styles.css), the sidebar/hamburger
// are hidden and replaced by #bottomNav; "More" reopens the same #sidebar element
// restyled as a bottom-sheet drawer, so the 8 routes aren't duplicated anywhere.
function initBottomNav() {
  const moreBtn = document.getElementById("moreNavBtn");
  const backdrop = document.getElementById("moreDrawerBackdrop");

  moreBtn.addEventListener("click", () => {
    document.body.classList.toggle("more-drawer-open");
  });
  backdrop.addEventListener("click", () => {
    document.body.classList.remove("more-drawer-open");
  });
}
