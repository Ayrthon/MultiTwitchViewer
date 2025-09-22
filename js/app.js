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
});
