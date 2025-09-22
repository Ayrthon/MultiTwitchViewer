import { state } from "./state.js";

export function saveStreams() {
  localStorage.setItem("multistream_data", JSON.stringify(state.streams));
}

export function loadStreams() {
  const stored = localStorage.getItem("multistream_data");
  if (stored) {
    const parsed = JSON.parse(stored);
    state.streams = parsed.map((s) => ({
      id: s.id,
      channel: s.channel,
      locked: s.locked || false,
    }));
  }
}
