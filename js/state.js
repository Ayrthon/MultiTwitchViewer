export const state = {
  CLIENT_ID: "6gc6nxubck1j20tumdvsl7ry72zlzd",
  PARENT: window.location.hostname,
  streams: [],
  user: null,
  searchTimeout: null,
  selectedSuggestionIndex: -1,
  currentSuggestions: [],
  followedChannels: [],
  OFFLINE_PAGE_SIZE: 100,
  offlineVisibleCount: 100,
  dragIndex: null,
  focusedId: null,
  AUTO_REFRESH_MS: 60_000, // 60s feels safe for Helix rate limits
  autoRefreshTimer: null,
  refreshAbort: null,
};
