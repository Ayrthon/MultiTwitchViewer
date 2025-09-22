import { state } from "./state.js";
import { chunkArray, formatViewerCount } from "./helpers.js";

/** Main fetch — add optional { signal } so we can abort between cycles */
export async function fetchRealFollowedChannels(opts = {}) {
  const { signal } = opts || {};
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
    // Bail early if aborted
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    // ---- Follows
    let afterFollows = null;
    const allFollows = [];
    do {
      const url = new URL("https://api.twitch.tv/helix/channels/followed");
      url.searchParams.set("user_id", state.user.id);
      url.searchParams.set("first", "100");
      if (afterFollows) url.searchParams.set("after", afterFollows);
      const res = await fetch(url, {
        signal,
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
    } while (afterFollows && !signal?.aborted);

    // ---- Live streams of follows
    let afterLive = null;
    const liveStreams = [];
    do {
      const url = new URL("https://api.twitch.tv/helix/streams/followed");
      url.searchParams.set("user_id", state.user.id);
      url.searchParams.set("first", "100");
      if (afterLive) url.searchParams.set("after", afterLive);
      const res = await fetch(url, {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": state.CLIENT_ID,
        },
      });
      if (!res.ok) throw new Error(`Streams API ${res.status}`);
      const json = await res.json();
      liveStreams.push(...json.data);
      afterLive = json.pagination?.cursor || null;
    } while (afterLive && !signal?.aborted);

    // ---- Users lookup
    const liveIds = new Set(liveStreams.map((s) => s.user_id));
    const allFollowIds = allFollows.map((f) => f.broadcaster_id);
    const offlineIds = allFollowIds.filter((id) => !liveIds.has(id));
    const idsToFetch = [...new Set([...liveIds, ...offlineIds])];

    const usersById = new Map();
    for (const chunk of chunkArray(idsToFetch, 100)) {
      if (chunk.length === 0) continue;
      const usersUrl =
        "https://api.twitch.tv/helix/users?" +
        chunk.map((id) => `id=${encodeURIComponent(id)}`).join("&");
      const res = await fetch(usersUrl, {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": state.CLIENT_ID,
        },
      });
      if (!res.ok) throw new Error(`Users API ${res.status}`);
      const usersJson = await res.json();
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
    // Ignore deliberate aborts; log others and show demo so UI isn’t empty
    if (err?.name !== "AbortError") {
      console.error("Follows/live error:", err);
      loadDemoFollowedChannels();
    }
  } finally {
    updateFollowedChannelsUI();
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "🔄 Refresh";
    }
  }
}

/** Simple auto-refresh loop with backoff & tab-visibility pause */
export function startSidebarAutoRefresh() {
  stopSidebarAutoRefresh(); // clean slate
  const loop = async (delayMs) => {
    state.autoRefreshTimer = window.setTimeout(async () => {
      // pause when hidden or logged out
      if (!state.user || document.hidden) return loop(state.AUTO_REFRESH_MS);

      // cancel any in-flight batch from previous tick
      if (state.refreshAbort) state.refreshAbort.abort();
      state.refreshAbort = new AbortController();
      const startedAt = Date.now();

      try {
        await fetchRealFollowedChannels({ signal: state.refreshAbort.signal });
        const took = Date.now() - startedAt;
        // success: schedule next regular refresh
        loop(Math.max(0, state.AUTO_REFRESH_MS - took));
      } catch (e) {
        // aborts come here too; just schedule a normal delay
        loop(state.AUTO_REFRESH_MS * 2); // gentle backoff on failures
      }
    }, delayMs);
  };
  loop(0); // fire immediately
}

export function stopSidebarAutoRefresh() {
  if (state.autoRefreshTimer) {
    clearTimeout(state.autoRefreshTimer);
    state.autoRefreshTimer = null;
  }
  if (state.refreshAbort) {
    state.refreshAbort.abort();
    state.refreshAbort = null;
  }
}
