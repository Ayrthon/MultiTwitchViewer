import { state } from "./state.js";
import {
  fetchRealFollowedChannels,
  updateFollowedChannelsUI,
} from "./follows.js";

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
    return;
  }
  if (accessToken) {
    localStorage.setItem("twitch_token", accessToken);
    window.location.hash = "";
    fetchUserData(accessToken);
  } else {
    const storedToken = localStorage.getItem("twitch_token");
    if (storedToken) fetchUserData(storedToken);
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
        fetchRealFollowedChannels();
      }
    } else {
      localStorage.removeItem("twitch_token");
      updateUserInfo();
      updateFollowedChannelsUI();
    }
  } catch (e) {
    console.error("Error fetching user data:", e);
    localStorage.removeItem("twitch_token");
    updateUserInfo();
    updateFollowedChannelsUI();
  }
}

export function updateUserInfo() {
  const userInfo = document.getElementById("userInfo");
  if (state.user) {
    userInfo.innerHTML = `
      <img src="${state.user.profile_image_url}" alt="Avatar" class="user-avatar">
      <span class="username">${state.user.display_name}</span>
      <button class="login-btn" id="logoutBtn" style="background:#ff4757;">Logout</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", logout);
  } else {
    userInfo.innerHTML = `<button class="login-btn" id="loginBtn">🎮 Login with Twitch</button>`;
    document
      .getElementById("loginBtn")
      .addEventListener("click", loginToTwitch);
  }
}

export function logout() {
  localStorage.removeItem("twitch_token");
  state.user = null;
  location.reload();
}
