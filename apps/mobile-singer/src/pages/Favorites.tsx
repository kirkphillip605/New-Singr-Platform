import { useEffect } from 'react';
import { Page, f7, useStore } from 'framework7-react';
import SongList, { SongItem } from '../components/SongList';
import store from '../lib/store';
import VibeNavbar from '../components/VibeNavbar';
import { useSession } from '../lib/auth-client';
import { getFavorites } from '../lib/api';

export default function FavoritesPage() {
  const favorites = (useStore('favorites') || []) as any[];
  const { data: session, isPending } = useSession();
  const isRegistered = !!session?.user && !(session.user as any).isAnonymous;

  // Refresh from the backend whenever a registered session is available.
  useEffect(() => {
    if (!isRegistered) return;
    getFavorites()
      .then((favs) => {
        store.dispatch(
          'setFavorites',
          favs.map((f) => ({ id: f.id, artist: f.artist, title: f.title }))
        );
      })
      .catch((err) => console.error('Failed to load favorites:', err));
  }, [isRegistered]);

  // Tapping a favorite prefills the Search tab with "{artist} {title}".
  const handleSongTap = (song: SongItem) => {
    store.dispatch('setSearchPrefill', `${song.artist} ${song.title}`.trim());
    f7.tab.show('#view-search');
  };

  const openSignUp = () => {
    window.dispatchEvent(new CustomEvent('singr:open-signup'));
    f7.panel.open('right');
  };

  // Favorites stored as { id, artist, title }; map to SongItem for SongList.
  const favoriteSongs: SongItem[] = favorites.map((f) => ({
    songId: f.id,
    artist: f.artist,
    title: f.title,
  }));

  return (
    <Page name="favorites" className="favorites-page">
      <VibeNavbar />

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">Favorites</div>
        <div className="page-header-sub">Your quick-request song list</div>
      </div>

      {/* Favorites List Content */}
      <div style={{ padding: '0 16px 24px' }}>
        {!isPending && !isRegistered ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="f7-icons">heart</i>
            </div>
            <div className="empty-state-title">Favorites are for members</div>
            <div className="empty-state-text">
              Favorites are for registered members — creating an account is free. Sign up to save songs for quick access.
            </div>
            <button className="go-to-shows-btn" style={{ marginTop: '16px' }} onClick={openSignUp}>
              Create a Free Account
            </button>
          </div>
        ) : favoriteSongs.length > 0 ? (
          <SongList songs={favoriteSongs} onSongTap={handleSongTap} />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="f7-icons">heart</i>
            </div>
            <div className="empty-state-title">No favorites yet</div>
            <div className="empty-state-text">
              Tap the heart icon next to any song in Search to save it here for quick access.
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
