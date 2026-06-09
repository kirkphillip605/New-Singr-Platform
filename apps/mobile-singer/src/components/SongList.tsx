import React from 'react';
import { useStore, f7 } from 'framework7-react';
import store from '../lib/store';
import { useSession } from '../lib/auth-client';
import { addFavorite, removeFavorite } from '../lib/api';

export interface SongItem {
  songId: string;
  title: string;
  artist: string;
}

interface SongListProps {
  songs: SongItem[];
  onSongTap: (song: SongItem) => void;
}

const sameSong = (a: { artist: string; title: string }, b: { artist: string; title: string }) =>
  a.artist?.toLowerCase() === b.artist?.toLowerCase() && a.title?.toLowerCase() === b.title?.toLowerCase();

function promptRegistration() {
  f7.dialog
    .create({
      title: 'Save your favorites',
      text: 'Favorites are for registered members — creating an account is free. Sign up to save songs for quick access.',
      buttons: [
        { text: 'Not now' },
        {
          text: 'Create Account',
          bold: true,
          onClick: () => {
            // Ask the profile panel to switch into sign-up mode, then open it.
            window.dispatchEvent(new CustomEvent('singr:open-signup'));
            f7.panel.open('right');
          },
        } as any,
      ],
    })
    .open();
}

export default function SongList({ songs, onSongTap }: SongListProps) {
  const favorites = (useStore('favorites') || []) as any[];
  const { data: session } = useSession();
  const isRegistered = !!session?.user && !(session.user as any).isAnonymous;

  if (!songs || songs.length === 0) return null;

  const handleFavoriteClick = async (e: React.MouseEvent, song: SongItem) => {
    e.stopPropagation();

    if (!isRegistered) {
      promptRegistration();
      return;
    }

    const existing = favorites.find((fav) => sameSong(fav, song));

    try {
      if (existing) {
        await removeFavorite(existing.id);
        store.dispatch(
          'setFavorites',
          favorites.filter((fav) => fav.id !== existing.id)
        );
        f7.toast.create({
          text: `Removed "${song.title}" from favorites`,
          position: 'bottom',
          closeTimeout: 1500,
        }).open();
      } else {
        const fav = await addFavorite(song.artist, song.title);
        store.dispatch('setFavorites', [
          ...favorites,
          { id: fav.id, artist: song.artist, title: song.title },
        ]);
        f7.toast.create({
          text: `Added "${song.title}" to favorites ❤️`,
          position: 'bottom',
          closeTimeout: 1500,
        }).open();
      }
    } catch (err: any) {
      console.error('Failed to update favorite:', err);
      f7.toast.create({
        text: err?.message || 'Could not update favorites. Please try again.',
        position: 'bottom',
        closeTimeout: 2000,
      }).open();
    }
  };

  return (
    <div className="song-list">
      {songs.map((song, index) => {
        const isFav = favorites.some((fav) => sameSong(fav, song));
        return (
          <div
            key={`${song.songId}-${index}`}
            className="song-item"
            onClick={() => onSongTap(song)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSongTap(song);
              }
            }}
          >
            {/* Heart Icon on Left */}
            <div
              className="favorite-btn"
              onClick={(e) => handleFavoriteClick(e, song)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleFavoriteClick(e as any, song);
                }
              }}
            >
              <i className={`f7-icons favorite-icon ${isFav ? 'favorited' : ''}`}>
                {isFav ? 'heart_fill' : 'heart'}
              </i>
            </div>

            <div className="song-item-info">
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
            </div>

            <div className="song-item-action">
              <i className="f7-icons">plus</i>
            </div>
          </div>
        );
      })}
    </div>
  );
}
