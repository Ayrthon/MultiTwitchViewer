import { state } from "./state.js";

export function setupAutoSuggest() {
  const input = document.getElementById("streamInput");
  input.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      hideSuggestions();
      return;
    }
    if (state.searchTimeout) clearTimeout(state.searchTimeout);
    state.searchTimeout = setTimeout(() => searchChannels(query), 300);
  });

  input.addEventListener("keydown", (e) => {
    const dropdown = document.getElementById("suggestionsDropdown");
    if (dropdown.style.display === "none") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.selectedSuggestionIndex = Math.min(
        state.selectedSuggestionIndex + 1,
        state.currentSuggestions.length - 1
      );
      updateSuggestionSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.selectedSuggestionIndex = Math.max(
        state.selectedSuggestionIndex - 1,
        -1
      );
      updateSuggestionSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        state.selectedSuggestionIndex >= 0 &&
        state.currentSuggestions[state.selectedSuggestionIndex]
      ) {
        selectSuggestion(
          state.currentSuggestions[state.selectedSuggestionIndex]
        );
      } else {
        const event = new CustomEvent("ui:addStream");
        window.dispatchEvent(event);
      }
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  input.addEventListener("blur", () =>
    setTimeout(() => hideSuggestions(), 150)
  );
}

export async function searchChannels(query) {
  const dropdown = document.getElementById("suggestionsDropdown");
  dropdown.innerHTML =
    '<div class="loading-suggestion">🔍 Searching channels...</div>';
  dropdown.style.display = "block";

  const token = localStorage.getItem("twitch_token");
  if (!token) {
    const fallback = [
      {
        id: "19571641",
        broadcaster_login: "ninja",
        display_name: "Ninja",
        game_name: "Fortnite",
        is_live: false,
        thumbnail_url:
          "https://static-cdn.jtvnw.net/jtv_user_pictures/ninja-profile_image-6c7353c6142f9f26-70x70.png",
      },
      {
        id: "44445592",
        broadcaster_login: "pokimane",
        display_name: "Pokimane",
        game_name: "Just Chatting",
        is_live: false,
        thumbnail_url:
          "https://static-cdn.jtvnw.net/jtv_user_pictures/pokimane-profile_image-4de9767e2b2af4b3-70x70.png",
      },
      {
        id: "37402112",
        broadcaster_login: "shroud",
        display_name: "shroud",
        game_name: "VALORANT",
        is_live: false,
        thumbnail_url:
          "https://static-cdn.jtvnw.net/jtv_user_pictures/shroud-profile_image-7ca02ca7498710fc-70x70.png",
      },
      {
        id: "71092938",
        broadcaster_login: "xqc",
        display_name: "xQc",
        game_name: "Grand Theft Auto V",
        is_live: false,
        thumbnail_url:
          "https://static-cdn.jtvnw.net/jtv_user_pictures/xqc-profile_image-9298dca608632101-70x70.png",
      },
    ].filter(
      (c) =>
        c.display_name.toLowerCase().includes(query.toLowerCase()) ||
        c.broadcaster_login.toLowerCase().includes(query.toLowerCase())
    );
    state.currentSuggestions = fallback;
    displaySuggestions(fallback);
    return;
  }

  try {
    const url = new URL("https://api.twitch.tv/helix/search/channels");
    url.searchParams.set("query", query);
    url.searchParams.set("first", "10");
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
    if (res.status === 429) throw new Error("Rate limited (429)");
    if (!res.ok) throw new Error(`search/channels ${res.status}`);

    const json = await res.json();
    const results = (json.data || []).map((ch) => ({
      id: ch.id,
      broadcaster_login: ch.broadcaster_login,
      display_name: ch.display_name || ch.broadcaster_login,
      game_name: ch.game_name || "",
      is_live: !!ch.is_live,
      thumbnail_url: ch.thumbnail_url || "",
      title: ch.title || "",
    }));
    state.currentSuggestions = results;
    displaySuggestions(results);
  } catch (err) {
    console.error("Channel search error:", err);
    dropdown.innerHTML = `<div class="loading-suggestion">Couldn’t search Twitch right now.</div>`;
  }
}

function displaySuggestions(channels) {
  const dropdown = document.getElementById("suggestionsDropdown");
  state.selectedSuggestionIndex = -1;
  if (!Array.isArray(channels) || channels.length === 0) {
    dropdown.innerHTML =
      '<div class="loading-suggestion">No channels found</div>';
    dropdown.style.display = "block";
    return;
  }
  dropdown.innerHTML = channels
    .map(
      (channel, index) => `
    <div class="suggestion-item" data-index="${index}" tabindex="0" role="button" aria-label="Select ${
        channel.display_name
      }">
      <img src="${channel.thumbnail_url || ""}" alt="${
        channel.display_name
      }" class="suggestion-avatar">
      <div class="suggestion-info">
        <div class="suggestion-name">${channel.display_name}</div>
        <div class="suggestion-game">${channel.game_name || ""}</div>
      </div>
      <span class="suggestion-viewers">${
        channel.is_live ? "🔴 LIVE" : ""
      }</span>
    </div>`
    )
    .join("");
  dropdown.style.display = "block";

  dropdown.querySelectorAll(".suggestion-item").forEach((item) => {
    item.addEventListener("click", () => {
      const idx = Number(item.getAttribute("data-index"));
      selectSuggestion(channels[idx]);
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const idx = Number(item.getAttribute("data-index"));
        selectSuggestion(channels[idx]);
      }
    });
  });
}

function updateSuggestionSelection() {
  document.querySelectorAll(".suggestion-item").forEach((item, index) => {
    item.classList.toggle("selected", index === state.selectedSuggestionIndex);
  });
}

function selectSuggestion(channel) {
  const input = document.getElementById("streamInput");
  input.value = (
    channel.broadcaster_login ||
    channel.display_name ||
    ""
  ).toLowerCase();
  hideSuggestions();
  const event = new CustomEvent("ui:addStream");
  window.dispatchEvent(event);
}

function hideSuggestions() {
  const dropdown = document.getElementById("suggestionsDropdown");
  dropdown.style.display = "none";
  state.selectedSuggestionIndex = -1;
  state.currentSuggestions = [];
}
