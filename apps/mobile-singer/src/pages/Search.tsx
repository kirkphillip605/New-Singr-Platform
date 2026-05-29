import { useState, useRef, useCallback, useEffect } from 'react';
import { Page, Preloader, f7, useStore } from 'framework7-react';
import { searchSongs } from '../lib/api';
import store from '../lib/store';
import SongList, { SongItem } from '../components/SongList';
import VibeNavbar from '../components/VibeNavbar';

export default function SearchPage() {
  const venueUrlName = useStore('venueUrlName') as string | undefined;
  const checkedInVenue = useStore('checkedInVenue');
  const searchResults = useStore('searchResults') as any[] || [];
  const searchCount = useStore('searchCount') as number || 0;
  const searchLoading = useStore('searchLoading') as boolean || false;
  const searchQuery = useStore('searchQuery') as string || '';

  const [inputValue, setInputValue] = useState(searchQuery);
  const debounceRef = useRef<any>(null);

  const handleSearch = useCallback((value: string) => {
    setInputValue(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      store.dispatch('clearSearch', undefined);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!venueUrlName) return;
      store.dispatch('setSearchLoading', true);
      try {
        const result = await searchSongs(venueUrlName, value.trim());
        store.dispatch('setSearchResults', {
          songs: result.songs,
          count: result.songCount,
          query: value.trim(),
        });
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        store.dispatch('setSearchLoading', false);
      }
    }, 350);
  }, [venueUrlName]);

  const clearSearch = () => {
    setInputValue('');
    store.dispatch('clearSearch', undefined);
  };

  const handleSongTap = (song: SongItem) => {
    store.dispatch('openRequestSheet', song);
  };

  // Sync state if it was cleared elsewhere
  useEffect(() => {
    if (!searchQuery) {
      setInputValue('');
    }
  }, [searchQuery]);

  return (
    <Page name="search" className="search-page">
      <VibeNavbar />

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">Find a Song</div>
        <div className="page-header-sub">Search by title or artist</div>
      </div>

      {/* Search Bar */}
      <div className="vibe-searchbar-wrap">
        <div className={`vibe-searchbar ${!checkedInVenue ? 'disabled' : ''}`}>
          <i className="f7-icons search-icon">search</i>
          <input
            type="text"
            placeholder="Search songs or artists…"
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            id="search-input"
            disabled={!checkedInVenue}
          />
          <span
            className={`clear-btn f7-icons ${inputValue ? 'visible' : ''}`}
            onClick={clearSearch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') clearSearch();
            }}
          >
            xmark_circle_fill
          </span>
        </div>
      </div>

      {/* Check-In Required Warning Card */}
      {!checkedInVenue ? (
        <div className="search-checkin-required-card">
          <div className="card-icon-wrap">
            <i className="f7-icons">exclamationmark_shield_fill</i>
          </div>
          <div className="card-title">Check-In Required</div>
          <div className="card-description">
            You must check in to a show before you can search the songbook or submit song requests.
          </div>
          <button
            className="go-to-shows-btn"
            onClick={() => f7.tab.show('#view-shows')}
          >
            <i className="f7-icons">placemark_fill</i>
            Find Nearby Shows
          </button>
        </div>
      ) : (
        <>
          {/* Loading */}
          {searchLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Preloader />
            </div>
          )}

          {/* Results Header */}
          {!searchLoading && searchQuery && (
            <div className="results-header">
              <span className="results-label">Results for "{searchQuery}"</span>
              <span className="results-count">{searchCount} songs found</span>
            </div>
          )}

          {/* Song Results */}
          {!searchLoading && searchResults.length > 0 && (
            <SongList songs={searchResults} onSongTap={handleSongTap} />
          )}

          {/* Empty state: no results */}
          {!searchLoading && searchQuery && searchResults.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="f7-icons">music_note</i>
              </div>
              <div className="empty-state-title">No songs found</div>
              <div className="empty-state-text">
                Try a different search term or check your spelling.
              </div>
            </div>
          )}

          {/* Empty state: no query */}
          {!searchLoading && !searchQuery && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="f7-icons">search</i>
              </div>
              <div className="empty-state-title">Start searching</div>
              <div className="empty-state-text">
                Type a song title or artist name to find tracks.
              </div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
