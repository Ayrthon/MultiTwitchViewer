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

  (function initSidebarOverlay() {
    const body = document.body;
    const drawer = document.getElementById("sidebar"); // the sidebar
    const burger = document.getElementById("sidebarToggle"); // ☰ button
    const backdrop = document.getElementById("sidebarBackdrop"); // scrim

    if (!drawer || !burger || !backdrop) return;

    function openSidebar() {
      body.classList.add("sidebar-open");
      burger.setAttribute("aria-expanded", "true");
      backdrop.hidden = false;
    }
    function closeSidebar() {
      body.classList.remove("sidebar-open");
      burger.setAttribute("aria-expanded", "false");
      backdrop.hidden = true;
    }
    function toggleSidebar() {
      if (body.classList.contains("sidebar-open")) closeSidebar();
      else openSidebar();
    }

    // open/close via UI
    burger.addEventListener("click", toggleSidebar);
    backdrop.addEventListener("click", closeSidebar);

    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSidebar();
    });

    // Optional: auto-close when navigating or resizing (keeps things tidy)
    window.addEventListener("resize", () => {
      if (body.classList.contains("sidebar-open")) closeSidebar();
    });
  })();
});
