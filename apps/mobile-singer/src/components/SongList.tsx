import React from 'react';
import { useStore, f7 } from 'framework7-react';
import store from '../lib/store';

export interface SongItem {
  songId: string;
  title: string;
  artist: string;
}

interface SongListProps {
  songs: SongItem[];
  onSongTap: (song: SongItem) => void;
}

export default function SongList({ songs, onSongTap }: SongListProps) {
  const favorites = useStore('favorites') || [];

  if (!songs || songs.length === 0) return null;

  const handleFavoriteClick = (e: React.MouseEvent, song: SongItem) => {
    e.stopPropagation();
    const isFav = favorites.some((fav: any) => fav.songId === song.songId);
    store.dispatch('toggleFavorite', song);

    f7.toast.create({
      text: isFav ? `Removed "${song.title}" from favorites` : `Added "${song.title}" to favorites ❤️`,
      position: 'bottom',
      closeTimeout: 1500,
    }).open();
  };

  return (
    <div className="song-list">
      {songs.map((song, index) => {
        const isFav = favorites.some((fav: any) => fav.songId === song.songId);
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
