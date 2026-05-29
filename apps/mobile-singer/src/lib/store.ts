import { createStore } from 'framework7/lite';

const SINGER_STORAGE_KEY = 'vibe_singer_name';
const VENUE_ID_STORAGE_KEY = 'vibe_venue_url_name';
const VENUE_OBJECT_STORAGE_KEY = 'vibe_checked_in_venue';
const FAVORITES_STORAGE_KEY = 'vibe_favorites';

const store = createStore({
  state: {
    venueUrlName: localStorage.getItem(VENUE_ID_STORAGE_KEY) || '',
    checkedInVenue: JSON.parse(localStorage.getItem(VENUE_OBJECT_STORAGE_KEY) || 'null'),
    singerName: localStorage.getItem(SINGER_STORAGE_KEY) || '',
    favorites: JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]'),
    
    searchResults: [],
    searchCount: 0,
    searchLoading: false,
    searchQuery: '',
    
    requestLoading: false,
    requestSuccess: false,
    requestError: '',
    
    requestSheetOpen: false,
    requestSheetSong: null,
  },
  getters: {
    venueUrlName({ state }: any) {
      return state.venueUrlName;
    },
    checkedInVenue({ state }: any) {
      return state.checkedInVenue;
    },
    singerName({ state }: any) {
      return state.singerName;
    },
    favorites({ state }: any) {
      return state.favorites;
    },
    searchResults({ state }: any) {
      return state.searchResults;
    },
    searchCount({ state }: any) {
      return state.searchCount;
    },
    searchLoading({ state }: any) {
      return state.searchLoading;
    },
    searchQuery({ state }: any) {
      return state.searchQuery;
    },
    requestLoading({ state }: any) {
      return state.requestLoading;
    },
    requestSheetOpen({ state }: any) {
      return state.requestSheetOpen;
    },
    requestSheetSong({ state }: any) {
      return state.requestSheetSong;
    },
  },
  actions: {
    setSingerName({ state }: any, name: string) {
      state.singerName = name;
      localStorage.setItem(SINGER_STORAGE_KEY, name);
    },
    setSearchResults({ state }: any, { songs, count, query }: any) {
      state.searchResults = songs;
      state.searchCount = count;
      state.searchQuery = query;
    },
    setSearchLoading({ state }: any, loading: boolean) {
      state.searchLoading = loading;
    },
    setRequestLoading({ state }: any, loading: boolean) {
      state.requestLoading = loading;
    },
    clearSearch({ state }: any) {
      state.searchResults = [];
      state.searchCount = 0;
      state.searchQuery = '';
    },
    toggleFavorite({ state }: any, song: any) {
      const idx = state.favorites.findIndex((s: any) => s.songId === song.songId);
      let newFavorites;
      if (idx >= 0) {
        newFavorites = state.favorites.filter((s: any) => s.songId !== song.songId);
      } else {
        newFavorites = [...state.favorites, song];
      }
      state.favorites = newFavorites;
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(state.favorites));
    },
    openRequestSheet({ state }: any, song: any) {
      state.requestSheetSong = song;
      state.requestSheetOpen = true;
    },
    closeRequestSheet({ state }: any) {
      state.requestSheetOpen = false;
    },
    checkInVenue({ state }: any, venue: any) {
      state.venueUrlName = venue.venueId;
      state.checkedInVenue = venue;
      localStorage.setItem(VENUE_ID_STORAGE_KEY, venue.venueId);
      localStorage.setItem(VENUE_OBJECT_STORAGE_KEY, JSON.stringify(venue));
    },
    checkOutVenue({ state }: any) {
      state.venueUrlName = '';
      state.checkedInVenue = null;
      localStorage.removeItem(VENUE_ID_STORAGE_KEY);
      localStorage.removeItem(VENUE_OBJECT_STORAGE_KEY);
    },
  },
});

export default store;
