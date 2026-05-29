import { useState, useEffect } from 'react';
import { Page, Block, Preloader, f7, useStore } from 'framework7-react';
import VibeNavbar from '../components/VibeNavbar';
import { getLiveQueue } from '../lib/api';

interface LiveRequest {
  id: string;
  singerName: string;
  song: {
    title: string;
    artist: string;
  };
  status: 'pending' | 'accepted' | 'playing' | 'processed';
  submittedAt: string;
}

export default function LivePage() {
  const checkedInVenue = useStore('checkedInVenue') as any;
  const [queue, setQueue] = useState<LiveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQueue = async (showId: string, silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await getLiveQueue(showId);
      const sorted = [...data].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      setQueue(sorted);
    } catch (err: any) {
      console.error('Failed to load live queue:', err);
      if (!silent) setError('Could not load live rotation.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (checkedInVenue?.id) {
      fetchQueue(checkedInVenue.id);
      
      const interval = setInterval(() => {
        fetchQueue(checkedInVenue.id, true);
      }, 10000);

      return () => clearInterval(interval);
    } else {
      setQueue([]);
    }
  }, [checkedInVenue]);

  const nowPlaying = queue.find(r => r.status === 'playing') || queue[0] || null;
  const rotation = nowPlaying 
    ? queue.filter(r => r.id !== nowPlaying.id && r.status !== 'processed')
    : queue;

  const uniqueSingers = new Set(queue.map(r => r.singerName.toLowerCase())).size;
  const estWaitMin = queue.length * 5;

  return (
    <Page name="live" className="live-page">
      <VibeNavbar />

      <div className="page-header" style={{ paddingBottom: '8px' }}>
        <div className="page-header-title">Live Stage</div>
        <div className="page-header-sub">See who is on stage and upcoming rotation</div>
      </div>

      {!checkedInVenue ? (
        <div className="search-checkin-required-card" style={{ margin: '16px' }}>
          <div className="card-icon-wrap">
            <i className="f7-icons">exclamationmark_shield_fill</i>
          </div>
          <div className="card-title">Check-In Required</div>
          <div className="card-description">
            You must check in to a show before you can view the live stage queue.
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
        <Block style={{ margin: '16px' }}>
          {loading && queue.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
              <Preloader />
            </div>
          ) : error && queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--vibe-text-secondary)' }}>
              <i className="f7-icons" style={{ fontSize: '32px', color: 'var(--vibe-error)' }}>exclamationmark_triangle</i>
              <div style={{ marginTop: '8px' }}>{error}</div>
            </div>
          ) : (
            <>
              {/* Now Playing Banner */}
              {nowPlaying ? (
                <div className="live-now-playing-banner">
                  <div className="banner-glowing-effect"></div>
                  <div className="banner-badge">
                    <span className="pulse-indicator-live"></span>
                    ON STAGE
                  </div>
                  <div className="now-playing-song">{nowPlaying.song?.title}</div>
                  <div className="now-playing-artist">by {nowPlaying.song?.artist}</div>
                  <div className="now-playing-footer">
                    <i className="f7-icons">person_crop_circle_fill</i>
                    <span>Singer: {nowPlaying.singerName}</span>
                  </div>
                </div>
              ) : (
                <div className="live-now-playing-banner" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vibe-text-secondary)', padding: '24px 0' }}>
                    Stage is quiet... no requests active.
                  </div>
                </div>
              )}

              {/* Show Stats */}
              <div className="live-stats-row" style={{ marginTop: '16px' }}>
                <div className="stat-card">
                  <div className="stat-value">{uniqueSingers}</div>
                  <div className="stat-label">Singers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{estWaitMin}m</div>
                  <div className="stat-label">Est. Wait</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value active">Open</div>
                  <div className="stat-label">Requests</div>
                </div>
              </div>

              {/* Rotation Card */}
              <div className="panel-card" style={{ marginTop: '20px', padding: '16px 20px' }}>
                <div className="panel-card-title" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Upcoming Rotation</span>
                  <span style={{ fontSize: '11px', color: 'var(--vibe-text-tertiary)', fontWeight: 'normal' }}>Updates live</span>
                </div>

                <div className="rotation-list">
                  {rotation.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--vibe-text-tertiary)', fontSize: '13px' }}>
                      No upcoming singers in rotation.
                    </div>
                  ) : (
                    rotation.map((item, index) => (
                      <div key={item.id} className="rotation-item">
                        <div className="rotation-number">#{index + 1}</div>
                        <div className="rotation-info">
                          <div className="rotation-singer">{item.singerName}</div>
                          <div className="rotation-song">{item.song?.title}</div>
                        </div>
                        <div className="rotation-time">
                          {(index + 1) * 5}m wait
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </Block>
      )}
    </Page>
  );
}
