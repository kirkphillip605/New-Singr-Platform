import { useState } from 'react';
import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard } from '@singr/ui';
import { Sparkles } from 'lucide-react';

interface HistoryItem {
  id: string;
  songTitle: string;
  songArtist: string;
  venueName: string;
  status: "pending" | "processed" | "cancelled";
  queuePosition?: number;
}

export default function HistoryView() {
  const [history] = useState<HistoryItem[]>([
    {
      id: "h-1",
      songTitle: "Bohemian Rhapsody",
      songArtist: "Queen",
      venueName: "Main Street Grill",
      status: "pending",
      queuePosition: 3,
    },
    {
      id: "h-2",
      songTitle: "Sweet Child O' Mine",
      songArtist: "Guns N' Roses",
      venueName: "The Glass Lounge",
      status: "processed",
    },
  ]);

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">⏱️ My Requests</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6">
        
        {/* Active show banner */}
        <div className="bg-[var(--singr-bg-secondary)]/10 p-4 rounded-2xl border border-[var(--singr-border)] backdrop-blur-md font-sans text-xs">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--singr-accent-primary)] animate-pulse" /> Live Queue Tracking
          </p>
          <p className="text-[var(--singr-text-secondary)] m-0 leading-relaxed">
            Your position in the host's queue is recalculated instantly on updates.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {history.length === 0 ? (
            <GlassCard className="p-8 text-center bg-white/5 border border-white/5">
              <p className="text-sm text-[var(--singr-text-secondary)] font-sans m-0">
                You haven't requested any songs yet. Go to the Catalog to submit!
              </p>
            </GlassCard>
          ) : (
            history.map((item) => (
              <GlassCard key={item.id} className="p-5 flex justify-between items-center gap-4" hoverable={true}>
                <div>
                  <h4 className="text-sm font-extrabold text-white leading-tight mb-1">{item.songTitle}</h4>
                  <p className="text-[10px] text-[var(--singr-text-secondary)] font-sans mb-2">{item.songArtist} • {item.venueName}</p>
                  
                  {item.status === "pending" && item.queuePosition !== undefined && (
                    <span className="text-[10px] font-bold text-[var(--singr-accent-primary)] uppercase tracking-wider font-sans">
                      Position in Queue: #{item.queuePosition}
                    </span>
                  )}
                </div>

                <div>
                  <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${
                    item.status === "pending" 
                      ? "text-orange-400 bg-orange-500/10 animate-pulse" 
                      : item.status === "processed" 
                        ? "text-emerald-400 bg-emerald-500/10" 
                        : "text-red-400 bg-red-500/10"
                  }`}>
                    {item.status === "pending" ? "Pending" : item.status === "processed" ? "Played" : "Cancelled"}
                  </span>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      </Block>
    </Page>
  );
}
