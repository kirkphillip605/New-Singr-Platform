import { useState } from 'react';
import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard, GlassButton } from '@singr/ui';
import { Trash2 } from 'lucide-react';

interface Favorite {
  id: string;
  title: string;
  artist: string;
}

export default function FavoritesView() {
  const [favorites, setFavorites] = useState<Favorite[]>([
    { id: "fav-1", title: "Bohemian Rhapsody", artist: "Queen" },
    { id: "fav-2", title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
  ]);

  const handleDelete = (id: string) => {
    setFavorites(favorites.filter(fav => fav.id !== id));
  };

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">⭐️ My Favorites</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6">
        <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">
          Save your absolute best vocal tracks to request them in a single tap at any venue show.
        </p>

        <div className="flex flex-col gap-4">
          {favorites.length === 0 ? (
            <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                No favorites saved yet. Browse the Catalog and tap star to add them.
              </p>
            </GlassCard>
          ) : (
            favorites.map((fav) => (
              <GlassCard key={fav.id} className="p-4 flex justify-between items-center gap-4" hoverable={true}>
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-tight mb-1">{fav.title}</h4>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">{fav.artist}</p>
                </div>
                <div className="flex gap-2">
                  <GlassButton variant="primary" className="py-1.5 px-3 text-xs font-bold">
                    Quick Request
                  </GlassButton>
                  <GlassButton 
                    onClick={() => handleDelete(fav.id)}
                    variant="secondary" 
                    className="py-1.5 px-2.5 border border-red-500/10 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </GlassButton>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </Block>
    </Page>
  );
}
