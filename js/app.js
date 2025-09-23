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

  const refreshBtn = document.getElementById("refreshButton");
  const countdownEl = document.getElementById("countdown"); // OK if null

  // ---- Refresh + countdown ----
  const REFRESH_EVERY_MS = 5 * 60 * 1000;
  let countdownSeconds = REFRESH_EVERY_MS / 1000;
  let autoRefreshId = null;
  let countdownIntervalId = null;

  function updateCountdownDisplay() {
    if (!countdownEl) return; // safely skip if not present
    const m = Math.floor(countdownSeconds / 60);
    const s = countdownSeconds % 60;
    countdownEl.textContent = `Next refresh in ${m}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  function resetCountdown() {
    countdownSeconds = REFRESH_EVERY_MS / 1000;
    updateCountdownDisplay();
  }

  async function refreshFollowedChannels() {
    try {
      if (state.user) {
        await fetchRealFollowedChannels();
      } else {
        updateFollowedChannelsUI();
      }
    } finally {
      // whenever we refresh (manual or auto), reset the countdown
      resetCountdown();
    }
  }

  function startAutoRefresh() {
    // prevent duplicates if called multiple times
    stopAutoRefresh();

    autoRefreshId = setInterval(refreshFollowedChannels, REFRESH_EVERY_MS);

    countdownIntervalId = setInterval(() => {
      countdownSeconds = Math.max(0, countdownSeconds - 1);
      updateCountdownDisplay();
    }, 1000);

    resetCountdown(); // initialize display
  }

  function stopAutoRefresh() {
    if (autoRefreshId) {
      clearInterval(autoRefreshId);
      autoRefreshId = null;
    }
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
  }

  // Manual button refresh (single listener)
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshFollowedChannels);
  }

  // Kick it off
  refreshFollowedChannels();
  startAutoRefresh();

  // ---- Other app boot wiring ----
  window.addEventListener("sidebar:addStream", (e) =>
    addStreamFromSidebar(e.detail)
  );
  window.addEventListener("ui:addStream", addStream);

  checkAuthFromURL();
  loadStreams();
  updateUI();
  setupAutoSuggest();
  updateFollowedChannelsUI();
  updateUserInfo();
});
