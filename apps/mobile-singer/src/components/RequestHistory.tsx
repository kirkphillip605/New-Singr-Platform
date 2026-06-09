import { useState, useEffect, useCallback } from 'react';
import { Preloader, Segmented, Button, f7, useStore } from 'framework7-react';
import { getHistory, HistoryItem, HistoryGroup } from '../lib/api';

type HistoryView = 'recent' | 'show' | 'all';

interface RequestHistoryProps {
  /** When true, (re)load the active view. */
  active: boolean;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const title = item.song?.title || 'Unknown song';
  const artist = item.song?.artist || '';
  const pitch = item.keyChange > 0 ? `+${item.keyChange}` : `${item.keyChange}`;
  return (
    <div className="song-item" style={{ cursor: 'default' }}>
      <div className="favorite-btn" style={{ color: 'var(--vibe-accent)' }}>
        <i className="f7-icons">checkmark_circle_fill</i>
      </div>
      <div className="song-item-info">
        <div className="song-title">{title}</div>
        <div className="song-artist" style={{ color: 'var(--vibe-text-secondary)' }}>{artist}</div>
        <div style={{ fontSize: '10px', color: 'var(--vibe-text-tertiary)', marginTop: '4px' }}>
          {item.singerName} • Pitch: {pitch}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--vibe-text-tertiary)' }}>
        {formatDate(item.submittedAt)}
      </div>
    </div>
  );
}

export default function RequestHistory({ active }: RequestHistoryProps) {
  const checkedInVenue = useStore('checkedInVenue') as any;
  const showId: string | undefined = checkedInVenue?.id;

  const [view, setView] = useState<HistoryView>('recent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [groups, setGroups] = useState<HistoryGroup[]>([]);

  const load = useCallback(async (currentView: HistoryView) => {
    // The "Recent" and "This Show" views require a checked-in show.
    if ((currentView === 'recent' || currentView === 'show') && !showId) {
      setItems([]);
      setGroups([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (currentView === 'all') {
        const { groups: g } = await getHistory({ groupByShow: true });
        setGroups(g || []);
        setItems([]);
      } else if (currentView === 'show') {
        const { history } = await getHistory({ showId });
        setItems(history || []);
        setGroups([]);
      } else {
        const { history } = await getHistory({ showId, hours: 12 });
        setItems(history || []);
        setGroups([]);
      }
    } catch (err: any) {
      console.error('Failed to load history:', err);
      setError(err?.message || 'Failed to load request history.');
      setItems([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    if (active) {
      load(view);
    }
  }, [active, view, load]);

  const needsCheckIn = (view === 'recent' || view === 'show') && !showId;

  const renderEmpty = (text: string) => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className="f7-icons">clock</i>
      </div>
      <div className="empty-state-title">No history yet</div>
      <div className="empty-state-text">{text}</div>
    </div>
  );

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {/* Segmented control */}
      <div className="perf-segmented-wrap" style={{ margin: '8px 0 16px' }}>
        <Segmented raised className="perf-type-segmented">
          <Button active={view === 'recent'} onClick={() => setView('recent')}>
            Recent
          </Button>
          <Button active={view === 'show'} onClick={() => setView('show')}>
            This Show
          </Button>
          <Button active={view === 'all'} onClick={() => setView('all')}>
            All Shows
          </Button>
        </Segmented>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <Preloader />
        </div>
      )}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="f7-icons">exclamationmark_triangle</i>
          </div>
          <div className="empty-state-title">Something went wrong</div>
          <div className="empty-state-text">{error}</div>
        </div>
      )}

      {!loading && !error && needsCheckIn && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="f7-icons">placemark</i>
          </div>
          <div className="empty-state-title">Check in to a show</div>
          <div className="empty-state-text">
            {view === 'recent'
              ? 'Recent requests show songs from the show you are checked in to. Check in to a show, or view "All Shows".'
              : 'This view shows requests for your current show. Check in to a show, or view "All Shows".'}
          </div>
          <button
            className="go-to-shows-btn"
            style={{ marginTop: '16px' }}
            onClick={() => {
              f7.popup.close('.dark-popup');
              f7.tab.show('#view-shows');
            }}
          >
            Find a Show
          </button>
        </div>
      )}

      {/* Recent / This Show lists */}
      {!loading && !error && !needsCheckIn && view !== 'all' && (
        items.length === 0 ? (
          renderEmpty(
            view === 'recent'
              ? 'No completed requests in the last 12 hours for this show.'
              : 'No completed requests yet for this show.'
          )
        ) : (
          <div className="song-list" style={{ padding: 0 }}>
            {items.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </div>
        )
      )}

      {/* All Shows grouped */}
      {!loading && !error && view === 'all' && (
        groups.length === 0 ? (
          renderEmpty('No completed requests across any shows yet.')
        ) : (
          <div>
            {groups.map((group) => (
              <div key={group.show.id} style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--vibe-text-secondary)',
                    padding: '8px 4px',
                  }}
                >
                  {group.show.showName}
                </div>
                <div className="song-list" style={{ padding: 0 }}>
                  {group.requests.map((item) => (
                    <HistoryRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
