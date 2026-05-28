import { useState, useEffect } from 'react';
import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard, GlassButton, GlassInput } from '@singr/ui';
import { Navigation, Key } from 'lucide-react';

interface NearbyShow {
  id: string;
  showName: string;
  venueName: string;
  distanceMiles: number;
  pinProtected: boolean;
}

export default function HomeView() {
  const [shows, setShows] = useState<NearbyShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinCode, setPinCode] = useState('');
  const [activePinShow, setActivePinShow] = useState<NearbyShow | null>(null);

  useEffect(() => {
    // Simulated nearby query sorting by distance (PostGIS simulation)
    const timer = setTimeout(() => {
      setShows([
        {
          id: "s-1",
          showName: "Main Street Friday Vibes",
          venueName: "Main Street Grill",
          distanceMiles: 0.4,
          pinProtected: false,
        },
        {
          id: "s-2",
          showName: "Glass Lounge VIP Night",
          venueName: "The Glass Lounge",
          distanceMiles: 1.2,
          pinProtected: true,
        },
      ]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleJoinShow = (show: NearbyShow) => {
    if (show.pinProtected) {
      setActivePinShow(show);
    } else {
      alert(`Successfully joined ${show.showName}! You can now search songs and request.`);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode === "8842") {
      alert(`Correct PIN! Successfully joined ${activePinShow?.showName}.`);
      setActivePinShow(null);
      setPinCode('');
    } else {
      alert("Invalid entry PIN code. Please try again.");
    }
  };

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">📍 Nearby Shows</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6">
        
        {/* Location banner */}
        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-[var(--singr-border)] font-sans text-xs">
          <div className="flex gap-2.5 items-center">
            <Navigation className="w-4 h-4 text-[var(--singr-accent-primary)] animate-pulse" />
            <span className="text-[var(--singr-text-secondary)]">Active Location: <strong className="text-white">Austin, TX</strong></span>
          </div>
          <span className="text-[10px] text-[var(--singr-text-secondary)]">Accuracy: 12m</span>
        </div>

        {/* Pin Protected verification drawer */}
        {activePinShow && (
          <GlassCard className="p-6">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-1">
              <Key className="w-4 h-4 text-purple-400" /> Verify Show PIN
            </h4>
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-4">
              "{activePinShow.showName}" is private. Ask your host for the entry code.
            </p>
            <form onSubmit={handleVerifyPin} className="flex gap-3">
              <GlassInput
                placeholder="4-digit PIN"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                maxLength={4}
                required
                className="py-2 text-sm"
              />
              <GlassButton type="submit" variant="primary" className="py-2 px-4 text-xs font-bold shrink-0">
                Unlock Show
              </GlassButton>
            </form>
          </GlassCard>
        )}

        {/* Nearby list */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <p className="text-xs text-[var(--singr-text-secondary)] font-sans">Searching PostGIS for nearby shows...</p>
          ) : (
            shows.map((show) => (
              <GlassCard key={show.id} className="p-5 flex justify-between items-center gap-4" hoverable={true}>
                <div>
                  <h4 className="text-base font-extrabold text-white leading-tight mb-1">{show.showName}</h4>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-2">{show.venueName}</p>
                  <span className="text-[10px] uppercase font-bold text-[var(--singr-accent-primary)] tracking-wider font-sans">
                    {show.distanceMiles} Miles Away
                  </span>
                </div>
                <GlassButton onClick={() => handleJoinShow(show)} variant={show.pinProtected ? "secondary" : "primary"} className="py-2 px-4 text-xs font-bold">
                  {show.pinProtected ? "Unlock PIN" : "Join Show"}
                </GlassButton>
              </GlassCard>
            ))
          )}
        </div>

      </Block>
    </Page>
  );
}
