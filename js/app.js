import { state } from "./state.js";
import { loginToTwitch, checkAuthFromURL, updateUserInfo } from "./auth.js";
import { loadStreams } from "./storage.js";
import {
  loadDemoFollowedChannels,
  updateFollowedChannelsUI,
  fetchRealFollowedChannels,
} from "./follows.js";
import { setupAutoSuggest } from "./search.js";
import { updateUI, addStream, addStreamFromSidebar } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  // Wire top-level buttons
  document.getElementById("addStreamBtn").addEventListener("click", addStream);
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", loginToTwitch);
  document.getElementById("refreshButton").addEventListener("click", () => {
    if (state.user) fetchRealFollowedChannels();
    else {
      loadDemoFollowedChannels();
      updateFollowedChannelsUI();
    }
  });

  // Listen for sidebar actions
  window.addEventListener("sidebar:addStream", (e) => {
    addStreamFromSidebar(e.detail);
  });

  // Listen for Enter/addStream from search
  window.addEventListener("ui:addStream", addStream);

  // Boot
  checkAuthFromURL();
  loadStreams();
  updateUI();
  setupAutoSuggest();

  if (!state.user) {
    loadDemoFollowedChannels();
  }
  updateFollowedChannelsUI();
  updateUserInfo();

  // === Sidebar auto-collapse for extra stream column ===

  // tune if your CSS changes
  const MIN_CARD_PX = 450; // from grid minmax(450px, 1fr)
  let sidebarPinnedOpen = false; // user preference

  function setSidebarCollapsed(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    // show/hide burger handled by CSS
  }

  function computeGridGapPx() {
    const grid = document.getElementById("streamsGrid");
    if (!grid) return 24;
    const cs = getComputedStyle(grid);
    // column gap for CSS grid; fallback to 24px (1.5rem)
    const gap = parseFloat(cs.columnGap || cs.gap || "24");
    return Number.isFinite(gap) ? gap : 24;
  }

  function countActualColumns() {
    const grid = document.getElementById("streamsGrid");
    if (!grid) return 1;
    const cs = getComputedStyle(grid);
    // In grid mode, gridTemplateColumns returns a list of track sizes
    if (cs.display === "grid") {
      const cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length;
      return Math.max(cols, 1);
    }
    // In focus-mode we use flex; just approximate by card width
    const gap = computeGridGapPx();
    const containerW =
      grid.clientWidth || window.innerWidth - getSidebarWidth();
    return Math.max(1, Math.floor((containerW + gap) / (MIN_CARD_PX + gap)));
  }

  function getSidebarWidth() {
    const el = document.querySelector(".sidebar");
    return el ? el.getBoundingClientRect().width : 0;
  }

  function wouldGainColumnIfCollapsed() {
    const gap = computeGridGapPx();
    const withSidebarW = window.innerWidth - getSidebarWidth();
    const withoutSidebarW = window.innerWidth;

    const colsWith = Math.floor((withSidebarW + gap) / (MIN_CARD_PX + gap));
    const colsWithout = Math.floor(
      (withoutSidebarW + gap) / (MIN_CARD_PX + gap)
    );

    return colsWithout > colsWith;
  }

  function evaluateAutoCollapse() {
    // don’t auto-tinker in focus-mode; respect user pin
    if (document.body.classList.contains("focus-mode")) return;
    if (sidebarPinnedOpen) return;

    const gain = wouldGainColumnIfCollapsed();
    setSidebarCollapsed(gain);
  }

  // Wire burger button
  (function initSidebarToggle() {
    const btn = document.getElementById("sidebarToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      // user explicitly wants it open now; pin it open
      sidebarPinnedOpen = true;
      setSidebarCollapsed(false);
    });

    // Optional: click outside to collapse again (unpin)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        sidebarPinnedOpen = false;
        evaluateAutoCollapse();
      }
    });
  })();

  // Re-evaluate when layout might change
  window.addEventListener("resize", evaluateAutoCollapse);
  document.addEventListener("DOMContentLoaded", () => {
    evaluateAutoCollapse();
  });

  // If you have code that adds/removes streams, call evaluateAutoCollapse()
  // after your grid updates. If not, this MutationObserver covers dynamic changes:
  const grid = document.getElementById("streamsGrid");
  if (grid && "MutationObserver" in window) {
    new MutationObserver(() => evaluateAutoCollapse()).observe(grid, {
      childList: true,
      subtree: false,
    });
  }
});
