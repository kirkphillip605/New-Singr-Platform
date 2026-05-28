import React, { useState } from 'react';
import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '@singr/ui';
import { Search, Sparkles } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
}

export default function CatalogView() {
  const [search, setSearch] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [keyChange, setKeyChange] = useState(0);
  const [singerName, setSingerName] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    setLoading(true);

    // Simulated Postgres GIN indexing full-text search match
    setTimeout(() => {
      setSongs([
        { id: "s-101", title: "Bohemian Rhapsody", artist: "Queen" },
        { id: "s-102", title: "Sweet Child O' Mine", artist: "Guns N' Roses" },
        { id: "s-103", title: "Back In Black", artist: "AC/DC" },
      ].filter(s => 
        s.title.toLowerCase().includes(search.toLowerCase()) || 
        s.artist.toLowerCase().includes(search.toLowerCase())
      ));
      setLoading(false);
    }, 400);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singerName || !selectedSong) return;

    alert(`Successfully requested "${selectedSong.title}" for ${singerName}! Check your live position in history.`);
    setSelectedSong(null);
    setSingerName('');
    setKeyChange(0);
  };

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">🔍 Catalog Songbook</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6">
        
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <GlassInput
            type="search"
            placeholder="Search by artist or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            required
            className="py-2.5 text-sm"
          />
          <GlassButton type="submit" variant="primary" className="py-2.5 px-4 shrink-0 text-xs font-bold flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> Search
          </GlassButton>
        </form>

        {/* Results grid */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans">Querying full-text GIN index ledger...</p>
          ) : songs.length === 0 ? (
            <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                Type an artist or track title above to search the system songbook.
              </p>
            </GlassCard>
          ) : (
            songs.map((song) => (
              <GlassCard key={song.id} className="p-4 flex justify-between items-center gap-4" hoverable={true}>
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-tight mb-1">{song.title}</h4>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans m-0">{song.artist}</p>
                </div>
                <GlassButton onClick={() => setSelectedSong(song)} variant="primary" className="py-1.5 px-3 text-xs font-bold">
                  Request
                </GlassButton>
              </GlassCard>
            ))
          )}
        </div>

        {/* Sleek request modal utilizing GlassModal */}
        <GlassModal 
          isOpen={!!selectedSong} 
          onClose={() => setSelectedSong(null)} 
          title="Submit Song Request"
        >
          {selectedSong && (
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-5 text-sm font-sans">
              <div>
                <p className="text-xs text-[var(--singr-text-secondary)] uppercase tracking-wider font-semibold mb-1">Selected Song</p>
                <p className="font-extrabold text-white text-base leading-tight mb-0.5">{selectedSong.title}</p>
                <p className="text-xs text-[var(--singr-text-secondary)] m-0">{selectedSong.artist}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Your Singer Name</label>
                <GlassInput
                  placeholder="e.g. Phillip Kirk"
                  value={singerName}
                  onChange={(e) => setSingerName(e.target.value)}
                  required
                />
              </div>

              {/* Key Change console */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase text-[var(--singr-text-secondary)]">Adjust Key (Pitch Shift)</label>
                <div className="flex items-center gap-4 bg-black/40 border border-[var(--glass-border)] rounded-xl p-3.5 justify-between">
                  <button 
                    type="button"
                    onClick={() => setKeyChange(prev => Math.max(-6, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <span className={`text-base font-mono font-extrabold ${keyChange > 0 ? "text-emerald-400" : keyChange < 0 ? "text-orange-400" : "text-white"}`}>
                    {keyChange > 0 ? `+${keyChange} (Higher)` : keyChange < 0 ? `${keyChange} (Lower)` : "0 (Original)"}
                  </span>
                  <button 
                    type="button"
                    onClick={() => setKeyChange(prev => Math.min(6, prev + 1))}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <GlassButton type="submit" variant="primary" className="w-full py-3 mt-2 text-sm font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Send Request to Host
              </GlassButton>
            </form>
          )}
        </GlassModal>

      </Block>
    </Page>
  );
}
