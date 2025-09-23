import { state } from "./state.js";
import {
  fetchRealFollowedChannels,
  updateFollowedChannelsUI,
} from "./follows.js";

/** Helper: broadcast auth changes to the app */
function dispatchAuthChanged() {
  window.dispatchEvent(
    new CustomEvent("auth:changed", { detail: { user: state.user } })
  );
}

export function loginToTwitch() {
  const authUrl =
    `https://id.twitch.tv/oauth2/authorize` +
    `?client_id=${state.CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(window.location.origin)}` +
    `&response_type=token` +
    `&scope=user:read:email user:read:follows` +
    `&force_verify=true`;
  window.location.href = authUrl;
}

export function checkAuthFromURL() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const error = params.get("error");

  if (error) {
    alert(`Login failed: ${error}`);
    // Ensure logged-out state is reflected
    localStorage.removeItem("twitch_token");
    state.user = null;
    updateUserInfo();
    updateFollowedChannelsUI();
    dispatchAuthChanged();
    return;
  }

  if (accessToken) {
    localStorage.setItem("twitch_token", accessToken);
    window.location.hash = "";
    fetchUserData(accessToken);
  } else {
    const storedToken = localStorage.getItem("twitch_token");
    if (storedToken) {
      fetchUserData(storedToken);
    } else {
      // No token at all → logged out
      state.user = null;
      updateUserInfo();
      updateFollowedChannelsUI();
      dispatchAuthChanged();
    }
  }
}

export async function fetchUserData(token) {
  try {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": state.CLIENT_ID,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        state.user = data.data[0];
        updateUserInfo();
        dispatchAuthChanged(); // 🔔 notify app that we're logged in
        fetchRealFollowedChannels(); // (no await needed)
        return;
      }
    }

    // If we get here, treat as logged out / invalid token
    localStorage.removeItem("twitch_token");
    state.user = null;
    updateUserInfo();
    updateFollowedChannelsUI();
    dispatchAuthChanged(); // 🔔 notify app that we're logged out
  } catch (e) {
    console.error("Error fetching user data:", e);
    localStorage.removeItem("twitch_token");
    state.user = null;
    updateUserInfo();
    updateFollowedChannelsUI();
    dispatchAuthChanged(); // 🔔 notify app that we're logged out
  }
}

export function updateUserInfo() {
  const userInfo = document.getElementById("userInfo");
  if (!userInfo) return;

  if (state.user) {
    userInfo.innerHTML = `
      <img src="${state.user.profile_image_url}" alt="Avatar" class="user-avatar">
      <span class="username">${state.user.display_name}</span>
      <button class="login-btn" id="logoutBtn" style="background:#ff4757;">Logout</button>
    `;
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
  } else {
    userInfo.innerHTML = `<button class="login-btn" id="loginBtn">🎮 Login with Twitch</button>`;
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) loginBtn.addEventListener("click", loginToTwitch);
  }
}

export function logout() {
  localStorage.removeItem("twitch_token");
  state.user = null;
  updateUserInfo();
  updateFollowedChannelsUI();
  dispatchAuthChanged(); // 🔔 notify app that we're logged out
  // Optional: if you prefer hard reload, uncomment below and remove the three lines above
  // location.reload();
}
