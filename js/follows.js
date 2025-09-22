import { state } from "./state.js";
import { chunkArray, formatViewerCount } from "./helpers.js";

export function loadDemoFollowedChannels() {
  state.followedChannels = [
    {
      id: "1",
      login: "ninja",
      display_name: "Ninja",
      profile_image_url:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-6c7353c6142f9f26-300x300.png",
      is_live: true,
      game_name: "Fortnite",
      viewer_count: 45732,
    },
    {
      id: "2",
      login: "pokimane",
      display_name: "Pokimane",
      profile_image_url:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/pokimane-profile_image-4de9767e2b2af4b3-300x300.png",
      is_live: true,
      game_name: "Just Chatting",
      viewer_count: 28456,
    },
    {
      id: "3",
      login: "shroud",
      display_name: "shroud",
      profile_image_url:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/shroud-profile_image-7ca02ca7498710fc-300x300.png",
      is_live: false,
      game_name: "Offline",
      viewer_count: 0,
    },
    {
      id: "4",
      login: "xqc",
      display_name: "xQc",
      profile_image_url:
        "https://static-cdn.jtvnw.net/jtv_user_pictures/xqc-profile_image-9298dca608632101-300x300.png",
      is_live: true,
      game_name: "Grand Theft Auto V",
      viewer_count: 67234,
    },
  ];
}

export async function fetchRealFollowedChannels() {
  if (!state.user) {
    loadDemoFollowedChannels();
    updateFollowedChannelsUI();
    return;
  }
  const refreshButton = document.getElementById("refreshButton");
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "🔄 Loading follows...";
  }
  const token = localStorage.getItem("twitch_token");
  try {
    // All follows
    let afterFollows = null;
    const allFollows = [];
    do {
      const url = new URL("https://api.twitch.tv/helix/channels/followed");
      url.searchParams.set("user_id", state.user.id);
      url.searchParams.set("first", "100");
      if (afterFollows) url.searchParams.set("after", afterFollows);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": state.CLIENT_ID,
        },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("twitch_token");
        throw new Error(`Auth error ${res.status}`);
      }
      if (!res.ok) throw new Error(`Follows API ${res.status}`);
      const json = await res.json();
      allFollows.push(...json.data);
      afterFollows = json.pagination?.cursor || null;
    } while (afterFollows);

    const allFollowIds = allFollows.map((f) => f.broadcaster_id);

    // Live streams of follows
    let afterLive = null;
    const liveStreams = [];
    do {
      const url = new URL("https://api.twitch.tv/helix/streams/followed");
      url.searchParams.set("user_id", state.user.id);
      url.searchParams.set("first", "100");
      if (afterLive) url.searchParams.set("after", afterLive);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": state.CLIENT_ID,
        },
      });
      if (!res.ok) throw new Error(`Streams API ${res.status}`);
      const json = await res.json();
      liveStreams.push(...json.data);
      afterLive = json.pagination?.cursor || null;
    } while (afterLive);

    const liveIds = new Set(liveStreams.map((s) => s.user_id));
    const offlineIds = allFollowIds.filter((id) => !liveIds.has(id));

    // Fetch user objects
    const idsToFetch = [...new Set([...liveIds, ...offlineIds])];
    const usersById = new Map();
    for (const chunk of chunkArray(idsToFetch, 100)) {
      if (chunk.length === 0) continue;
      const usersUrl =
        "https://api.twitch.tv/helix/users?" +
        chunk.map((id) => `id=${encodeURIComponent(id)}`).join("&");
      const usersRes = await fetch(usersUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": state.CLIENT_ID,
        },
      });
      if (!usersRes.ok) throw new Error(`Users API ${usersRes.status}`);
      const usersJson = await usersRes.json();
      usersJson.data.forEach((u) => usersById.set(u.id, u));
    }

    const liveList = liveStreams.map((s) => {
      const u = usersById.get(s.user_id);
      return {
        id: s.user_id,
        login: s.user_login,
        display_name: s.user_name,
        profile_image_url: u?.profile_image_url || "",
        is_live: true,
        game_name: s.game_name,
        viewer_count: s.viewer_count || 0,
        title: s.title || "",
      };
    });

    const offlineList = offlineIds.map((id) => {
      const u = usersById.get(id);
      return {
        id,
        login: u?.login || "",
        display_name: u?.display_name || (u?.login ?? ""),
        profile_image_url: u?.profile_image_url || "",
        is_live: false,
        game_name: "Offline",
        viewer_count: 0,
        title: "",
      };
    });

    state.followedChannels = [...liveList, ...offlineList];
    state.offlineVisibleCount = state.OFFLINE_PAGE_SIZE;
  } catch (err) {
    console.error("Follows/live error:", err);
    loadDemoFollowedChannels();
  } finally {
    updateFollowedChannelsUI();
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

export function updateFollowedChannelsUI() {
  const container = document.getElementById("followedChannels");
  if (!state.user) {
    container.innerHTML =
      '<div class="no-channels">Login to see followed channels</div>';
    return;
  }
  if (state.followedChannels.length === 0) {
    container.innerHTML =
      '<div class="no-channels">No followed channels found</div>';
    return;
  }

  const sorted = [...state.followedChannels].sort((a, b) => {
    if (a.is_live && !b.is_live) return -1;
    if (!a.is_live && b.is_live) return 1;
    if (a.is_live && b.is_live)
      return (b.viewer_count || 0) - (a.viewer_count || 0);
    return a.display_name.localeCompare(b.display_name);
  });

  const liveChannels = sorted.filter((ch) => ch.is_live);
  const offlineAll = sorted.filter((ch) => !ch.is_live);
  const totalOffline = offlineAll.length;
  const toShow = Math.min(state.offlineVisibleCount, totalOffline);
  const offlineShown = offlineAll.slice(0, toShow);
  const hasMore = toShow < totalOffline;

  let html = "";
  if (liveChannels.length > 0) {
    html += `<div class="channel-category">
        <div class="category-header">Live (${liveChannels.length})</div>
        ${liveChannels.map(createChannelHTML).join("")}
      </div>`;
  }
  html += `<div class="channel-category">
      <div class="category-header">Offline (${totalOffline})</div>
      ${
        totalOffline === 0
          ? '<div class="no-channels">No offline channels 🎉</div>'
          : offlineShown.map(createChannelHTML).join("")
      }
      ${
        hasMore
          ? `<div class="show-more-wrap"><button id="offlineShowMore" class="show-more-btn">Show ${Math.min(
              state.OFFLINE_PAGE_SIZE,
              totalOffline - toShow
            )} more</button></div>`
          : ""
      }
    </div>`;

  container.innerHTML = html;

  container.querySelectorAll(".channel-item").forEach((item) => {
    const channelLogin = item.dataset.channel;
    if (
      channelLogin &&
      !channelLogin.includes("_info") &&
      !channelLogin.includes("_note")
    ) {
      item.addEventListener("click", () => {
        const event = new CustomEvent("sidebar:addStream", {
          detail: channelLogin,
        });
        window.dispatchEvent(event);
      });
    } else {
      item.style.cursor = "default";
      item.style.opacity = "0.7";
    }
  });

  const showMoreBtn = document.getElementById("offlineShowMore");
  if (showMoreBtn) showMoreBtn.addEventListener("click", showMoreOffline);
}

export function showMoreOffline() {
  state.offlineVisibleCount += state.OFFLINE_PAGE_SIZE;
  updateFollowedChannelsUI();
}

function createChannelHTML(channel) {
  const viewerText = channel.is_live
    ? `<div class="channel-viewers">${formatViewerCount(
        channel.viewer_count
      )} viewers</div>`
    : "";
  return `
    <div class="channel-item ${channel.is_live ? "live" : ""}" data-channel="${
    channel.login
  }">
      <img src="${channel.profile_image_url}" alt="${
    channel.display_name
  }" class="channel-avatar">
      <div class="channel-info">
        <div class="channel-name">${channel.display_name}</div>
        <div class="channel-game">${channel.game_name}</div>
        ${viewerText}
      </div>
      <div class="${
        channel.is_live ? "live-indicator" : "offline-indicator"
      }"></div>
    </div>`;
}
