import { state } from "./state.js";
import { loginToTwitch, checkAuthFromURL, updateUserInfo } from "./auth.js";
import { loadStreams } from "./storage.js";
import {
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
      updateFollowedChannelsUI();
    }
  });

  // Countdown variables
  let countdownSeconds = 5 * 60; // 5 minutes
  let countdownInterval;

  function updateCountdownDisplay() {
    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;
    document.getElementById(
      "countdown"
    ).textContent = `Next refresh in ${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function resetCountdown() {
    countdownSeconds = 5 * 60; // reset to 5 minutes
    updateCountdownDisplay();
  }

  // Start auto refresh and countdown
  function startAutoRefresh() {
    // Refresh every 5 minutes
    setInterval(refreshFollowedChannels, 5 * 60 * 1000);

    // Update countdown every second
    countdownInterval = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        countdownSeconds = 0;
      }
      updateCountdownDisplay();
    }, 1000);

    resetCountdown(); // initialize display
  }

  // Manual button refresh
  document
    .getElementById("refreshButton")
    .addEventListener("click", refreshFollowedChannels);

  // Kick it off
  refreshFollowedChannels();
  startAutoRefresh();

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
  updateFollowedChannelsUI();
  updateUserInfo();
});
