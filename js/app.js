import { state } from "./state.js";
import { loginToTwitch, checkAuthFromURL, updateUserInfo } from "./auth.js";
import { loadStreams } from "./storage.js";
import {
  loadDemoFollowedChannels,
  updateFollowedChannelsUI,
  fetchRealFollowedChannels,
  startSidebarAutoRefresh,
  stopSidebarAutoRefresh,
} from "./follows.js";
import { setupAutoSuggest } from "./search.js";
import { updateUI, addStream, addStreamFromSidebar } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
  // Buttons
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

  // Custom events
  window.addEventListener("sidebar:addStream", (e) =>
    addStreamFromSidebar(e.detail)
  );
  window.addEventListener("ui:addStream", addStream);

  // Boot
  checkAuthFromURL();
  loadStreams();
  updateUI();
  setupAutoSuggest();

  if (!state.user) loadDemoFollowedChannels();
  updateFollowedChannelsUI();
  updateUserInfo();

  // Auto-refresh lifecycle
  startSidebarAutoRefresh();

  // Pause/resume when tab visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSidebarAutoRefresh();
    else startSidebarAutoRefresh();
  });

  // Handle network status
  window.addEventListener("online", () => startSidebarAutoRefresh());
  window.addEventListener("offline", () => stopSidebarAutoRefresh());
});
