// Sidebar overlay + smart auto-collapse
(function initSmartSidebar() {
  const body = document.body;
  const sidebar = document.getElementById("sidebar");
  const burger = document.getElementById("sidebarToggle");
  const backdrop = document.getElementById("sidebarBackdrop");
  const grid = document.getElementById("streamsGrid");

  if (!sidebar || !burger || !backdrop || !grid) return;

  // MIN_CARD_PX should match your CSS grid: minmax(450px, 1fr)
  const MIN_CARD_PX = 450;

  function getSidebarWidth() {
    const rect = sidebar.getBoundingClientRect();
    if (rect.width > 0) return rect.width;
    // when collapsed, computed width may be 0; fallback to CSS declared width
    const styleW = parseFloat(getComputedStyle(sidebar).width);
    return Number.isFinite(styleW) ? styleW : 0;
  }

  function getGapPx() {
    const cs = getComputedStyle(grid);
    const g = parseFloat(cs.columnGap || cs.gap || "24");
    return Number.isFinite(g) ? g : 24; // fallback ~1.5rem
  }

  function columnsFor(containerWidth) {
    const gap = getGapPx();
    return Math.max(
      1,
      Math.floor((containerWidth + gap) / (MIN_CARD_PX + gap))
    );
  }

  // Only collapse if hiding the sidebar would add a column
  function wouldGainColumnIfCollapsed() {
    const withSidebarW = Math.max(0, window.innerWidth - getSidebarWidth());
    const withoutSidebarW = window.innerWidth;
    return columnsFor(withoutSidebarW) > columnsFor(withSidebarW);
  }

  function setCollapsed(on) {
    body.classList.toggle("sidebar-collapsed", !!on);
    if (on === false) closeOverlay(); // ensure overlay isn’t left open
  }

  function evaluateAutoCollapse() {
    // don't auto-tinker while overlay is open or when in focus-mode
    if (body.classList.contains("sidebar-overlay")) return;
    if (body.classList.contains("focus-mode")) return;

    const gain = wouldGainColumnIfCollapsed();
    setCollapsed(gain);
  }

  // Overlay controls (no blur)
  function openOverlay() {
    body.classList.add("sidebar-overlay");
    burger.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  }
  function closeOverlay() {
    body.classList.remove("sidebar-overlay");
    burger.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  }
  function toggleOverlay() {
    if (body.classList.contains("sidebar-overlay")) closeOverlay();
    else openOverlay();
  }

  // Wire up UI
  burger.addEventListener("click", toggleOverlay);
  backdrop.addEventListener("click", closeOverlay);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOverlay();
  });

  // Re-evaluate when layout might change
  window.addEventListener("resize", evaluateAutoCollapse);

  // If your app adds/removes stream cards dynamically, this observes that:
  if ("MutationObserver" in window) {
    new MutationObserver(() => evaluateAutoCollapse()).observe(grid, {
      childList: true,
    });
  }

  // Initial check
  evaluateAutoCollapse();
})();
