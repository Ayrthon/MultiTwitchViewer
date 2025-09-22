import { state } from "./state.js";
import { applyLayout } from "./ui.js";

export function enableDragAndDrop(container) {
  container.querySelectorAll(".stream-item").forEach((item) => {
    if (!item._dndBound) {
      item.addEventListener("dragstart", onDragStart);
      item.addEventListener("dragover", onDragOver);
      item.addEventListener("dragleave", onDragLeave);
      item.addEventListener("drop", onDrop);
      item.addEventListener("dragend", onDragEnd);
      item._dndBound = true;
    }
  });
}

function onDragStart(e) {
  const item = e.currentTarget;
  state.dragIndex = Number(item.dataset.index);
  item.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", String(state.dragIndex));
}

function onDragOver(e) {
  e.preventDefault();
  const t = e.currentTarget;
  if (!t.classList.contains("drop-target")) t.classList.add("drop-target");
}

function onDragLeave(e) {
  e.currentTarget.classList.remove("drop-target");
}

function onDrop(e) {
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove("drop-target");

  const from = state.dragIndex;
  const to = Number(target.dataset.index);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;

  const [moved] = state.streams.splice(from, 1);
  state.streams.splice(to, 0, moved);
  const grid = document.getElementById("streamsGrid");
  const nodes = Array.from(grid.querySelectorAll(".stream-item"));
  const movingEl = nodes[from];
  const referenceEl = nodes[to];
  if (from < to) grid.insertBefore(movingEl, referenceEl.nextSibling);
  else grid.insertBefore(movingEl, referenceEl);

  refreshItemIndices(grid);
  applyLayout();
}

function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  state.dragIndex = null;
}

export function toggleFocus(streamId) {
  state.focusedId = state.focusedId === streamId ? null : streamId;
  applyLayout();
  // Label updates handled in ui.updateFocusButtonsLabel()
}

export function refreshItemIndices(container) {
  container.querySelectorAll(".stream-item").forEach((el, i) => {
    el.dataset.index = String(i);
  });
}
