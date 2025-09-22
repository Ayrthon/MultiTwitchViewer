import { state } from "./state.js";
import { saveStreams } from "./storage.js";
import {
  enableDragAndDrop,
  refreshItemIndices,
  toggleFocus,
} from "./dnd_focus.js";

export function updateUI() {
  const grid = document.getElementById("streamsGrid");
  const existingCards = grid.querySelectorAll(".stream-item");

  if (existingCards.length === 0) {
    if (state.streams.length === 0) {
      grid.innerHTML = "";
      showEmptyState(true);
      return;
    }
    grid.innerHTML = "";
    state.streams.forEach((stream, idx) =>
      grid.appendChild(createStreamElement(stream, idx))
    );
    enableDragAndDrop(grid);
    showEmptyState(false);
    applyLayout();
    updateFocusButtonsVisibility();
    updateFocusButtonsLabel();
    return;
  }

  Array.from(existingCards).forEach((card) => {
    const id = Number(card.dataset.id);
    if (!state.streams.some((s) => s.id === id)) card.remove();
  });

  state.streams.forEach((s, idx) => {
    if (!grid.querySelector(`.stream-item[data-id="${s.id}"]`)) {
      grid.appendChild(createStreamElement(s, idx));
    }
  });

  const orderMap = new Map(state.streams.map((s, i) => [String(s.id), i]));
  Array.from(grid.querySelectorAll(".stream-item"))
    .sort((a, b) => orderMap.get(a.dataset.id) - orderMap.get(b.dataset.id))
    .forEach((el) => grid.appendChild(el));

  refreshItemIndices(grid);
  enableDragAndDrop(grid);
  showEmptyState(state.streams.length === 0);
  applyLayout();
  updateFocusButtonsVisibility();
  updateFocusButtonsLabel();
}

export function addStreamFromSidebar(channelLogin) {
  if (state.streams.find((s) => s.channel === channelLogin)) {
    alert("This stream is already added");
    return;
  }
  const stream = { id: Date.now(), channel: channelLogin, locked: false };
  state.streams.push(stream);
  saveStreams();

  const grid = document.getElementById("streamsGrid");
  const empty = grid.querySelector(".no-streams");
  if (empty) empty.remove();

  const card = createStreamElement(stream, state.streams.length - 1);
  grid.appendChild(card);

  enableDragAndDrop(grid);
  refreshItemIndices(grid);
  applyLayout();
  updateFocusButtonsVisibility();
  updateFocusButtonsLabel();

  const channelItem = document.querySelector(
    `[data-channel="${channelLogin}"]`
  );
  if (channelItem) {
    const originalBg = channelItem.style.background;
    channelItem.style.background = "rgba(76, 175, 80, 0.3)";
    setTimeout(() => (channelItem.style.background = originalBg), 1000);
  }
}

export function addStream() {
  const input = document.getElementById("streamInput");
  const channelName = input.value.trim().toLowerCase();
  if (!channelName) {
    alert("Please enter a channel name");
    return;
  }
  if (state.streams.find((s) => s.channel === channelName)) {
    alert("This stream is already added");
    return;
  }

  const stream = { id: Date.now(), channel: channelName, locked: false };
  state.streams.push(stream);
  saveStreams();

  const grid = document.getElementById("streamsGrid");
  if (grid.querySelector(".no-streams")) grid.innerHTML = "";
  const card = createStreamElement(stream, state.streams.length - 1);
  grid.appendChild(card);

  enableDragAndDrop(grid);
  refreshItemIndices(grid);
  showEmptyState(false);
  applyLayout();
  updateFocusButtonsVisibility();
  updateFocusButtonsLabel();

  input.value = "";
  const dropdown = document.getElementById("suggestionsDropdown");
  dropdown.style.display = "none";
}

export function removeStream(streamId) {
  const idx = state.streams.findIndex((s) => s.id === streamId);
  if (idx === -1) return;
  state.streams.splice(idx, 1);
  saveStreams();

  const card = document.querySelector(`.stream-item[data-id="${streamId}"]`);
  if (card) card.remove();

  const grid = document.getElementById("streamsGrid");
  refreshItemIndices(grid);

  if (state.streams.length === 0 && !grid.querySelector(".no-streams")) {
    const n = document.createElement("div");
    n.className = "no-streams";
    n.textContent =
      "No streams added yet. Add a Twitch channel to get started!";
    grid.appendChild(n);
  }
  applyLayout();
}

export function applyLayout() {
  const grid = document.getElementById("streamsGrid");
  if (!grid) return;

  const cards = grid.querySelectorAll(".stream-item");

  // Clear stale focused if card was removed
  if (
    state.focusedId &&
    !grid.querySelector(`.stream-item[data-id="${state.focusedId}"]`)
  ) {
    state.focusedId = null;
  }

  cards.forEach((card) => card.classList.remove("focused", "single"));

  if (state.focusedId && state.streams.length > 1) {
    document.body.classList.add("focus-mode");
    const focused = grid.querySelector(
      `.stream-item[data-id="${state.focusedId}"]`
    );
    if (focused) focused.classList.add("focused", "single");
  } else {
    document.body.classList.remove("focus-mode");
    if (cards.length === 1) cards[0].classList.add("single");
  }

  updateFocusButtonsLabel();
}

export function updateFocusButtonsVisibility() {
  const hasMultiple = state.streams.length > 1;
  document.querySelectorAll('[data-role="focus-toggle"]').forEach((btn) => {
    btn.style.display = hasMultiple ? "" : "none";
  });
}

export function updateFocusButtonsLabel() {
  document.querySelectorAll(".stream-item").forEach((card) => {
    const id = Number(card.dataset.id);
    const btn = card.querySelector('[data-role="focus-toggle"]');
    if (!btn) return;
    btn.textContent = state.focusedId === id ? "Unfocus" : "Focus";
  });
}

function showEmptyState(show) {
  const grid = document.getElementById("streamsGrid");
  const empty = grid.querySelector(".no-streams");
  if (show) {
    if (!empty) {
      const n = document.createElement("div");
      n.className = "no-streams";
      n.textContent =
        "No streams added yet. Add a Twitch channel to get started!";
      grid.appendChild(n);
    }
  } else if (empty) empty.remove();
}

function createStreamElement(stream, index) {
  const card = document.createElement("div");
  card.className = "stream-item";
  card.setAttribute("draggable", "true");
  card.dataset.index = String(index);
  card.dataset.id = String(stream.id);

  card.innerHTML = `
    <div class="stream-header">
      <span class="stream-title">${stream.channel}</span>
      <div class="stream-controls">
        <button class="focus-btn" data-role="focus-toggle">Focus</button>
        <button class="remove-btn" data-role="remove">Remove</button>
      </div>
    </div>
    <div class="stream-video-container" data-stream-id="${stream.id}">
      <iframe
        src="https://player.twitch.tv/?channel=${stream.channel}&parent=${state.PARENT}"
        class="stream-video" frameborder="0" allow="fullscreen; picture-in-picture" allowfullscreen="true" scrolling="no">
      </iframe>
    </div>
    <div class="stream-chat">
      <iframe
        src="https://www.twitch.tv/embed/${stream.channel}/chat?darkpopout&parent=${state.PARENT}"
        frameborder="0" scrolling="no">
      </iframe>
    </div>
  `;

  // button events
  const focusBtn = card.querySelector('[data-role="focus-toggle"]');
  focusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFocus(stream.id);
  });

  const removeBtn = card.querySelector('[data-role="remove"]');
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeStream(stream.id);
  });

  return card;
}
