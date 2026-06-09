import { useState, useEffect } from 'react';
import { Page, Block, Preloader, Button, f7, useStore } from 'framework7-react';
import store from '../lib/store';
import VibeNavbar from '../components/VibeNavbar';
import { getNearbyVenues, joinShow } from '../lib/api';

export default function ShowsPage() {
  const checkedInVenue = useStore('checkedInVenue') as any;
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip' | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [range, setRange] = useState(25);
  const [manualCode, setManualCode] = useState('');
  const [checkingManualCode, setCheckingManualCode] = useState(false);

  const fetchLocation = () => {
    setLoadingLocation(true);
    setLoadingVenues(true);
    setError('');

    if (!navigator.geolocation) {
      handleIPFallback('Geolocation not supported by browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setCoords({ latitude: lat, longitude: lon });
        setLoadingLocation(false);
        setLocationSource('gps');
      },
      (err) => {
        console.warn('GPS location request failed, trying IP fallback:', err.message);
        handleIPFallback(err.message);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleIPFallback = async (reason: string) => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('IP geolocation API returned an error');
      }
      const data = await response.json();
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        setCoords({ latitude: data.latitude, longitude: data.longitude });
        setLoadingLocation(false);
        setLocationSource('ip');
      } else {
        throw new Error('Invalid coordinates returned from IP fallback');
      }
    } catch (ipErr) {
      console.error('IP location request failed:', ipErr);
      setLoadingLocation(false);
      setLoadingVenues(false);
      setError(`Could not retrieve location (${reason}). Please check your permissions.`);
    }
  };

  const fetchNearby = async (lat: number, lon: number, currentRange: number) => {
    try {
      setLoadingVenues(true);
      const results = await getNearbyVenues(lat, lon, currentRange);
      setVenues(results);
    } catch (err) {
      console.error('Failed to fetch nearby venues:', err);
      setError('Failed to load nearby venues from API.');
    } finally {
      setLoadingVenues(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  useEffect(() => {
    if (coords) {
      fetchNearby(coords.latitude, coords.longitude, range);
    }
  }, [coords, range]);

  const handleCheckIn = async (venue: any) => {
    f7.dialog.preloader(`Joining ${venue.name}...`);
    const res = await joinShow(venue.venueId);
    f7.dialog.close();

    if (res.success && res.show) {
      store.dispatch('checkInVenue', {
        venueId: res.show.slug,
        name: res.show.showName,
        id: res.show.id,
      });
      f7.tab.show('#view-search');
      f7.toast.create({
        text: `Checked in to ${res.show.showName}! 🎤`,
        position: 'bottom',
        closeTimeout: 2000,
      }).open();
    } else if (res.pinRequired) {
      promptPIN(venue.venueId, venue.name);
    } else {
      f7.toast.create({
        text: res.error || 'Failed to join show.',
        position: 'bottom',
        closeTimeout: 2000,
      }).open();
    }
  };

  const promptPIN = (slug: string, showName: string) => {
    f7.dialog.prompt(
      `"${showName}" is private. Enter entry PIN code:`,
      'Verify Show PIN',
      async (pin) => {
        if (!pin.trim()) return;
        f7.dialog.preloader('Verifying PIN...');
        const res = await joinShow(slug, pin);
        f7.dialog.close();

        if (res.success && res.show) {
          store.dispatch('checkInVenue', {
            venueId: res.show.slug,
            name: res.show.showName,
            id: res.show.id,
          });
          f7.tab.show('#view-search');
          f7.toast.create({
            text: `Checked in to ${res.show.showName}! 🎤`,
            position: 'bottom',
            closeTimeout: 2000,
          }).open();
        } else {
          f7.toast.create({
            text: res.error || 'Incorrect PIN code.',
            position: 'bottom',
            closeTimeout: 2000,
          }).open();
        }
      }
    );
  };

  const handleManualCheckIn = async () => {
    const code = manualCode.trim().toLowerCase();
    if (!code) return;

    setCheckingManualCode(true);
    try {
      const res = await joinShow(code);
      if (res.success && res.show) {
        store.dispatch('checkInVenue', {
          venueId: res.show.slug,
          name: res.show.showName,
          id: res.show.id,
        });
        f7.tab.show('#view-search');
        f7.toast.create({
          text: `Checked in to ${res.show.showName}! 🎤`,
          position: 'bottom',
          closeTimeout: 2000,
        }).open();
        setManualCode('');
      } else if (res.pinRequired) {
        promptPIN(code, code);
        setManualCode('');
      } else {
        f7.toast.create({
          text: res.error || `Show code "${code}" does not exist or is inactive.`,
          position: 'bottom',
          closeTimeout: 2000,
        }).open();
      }
    } catch (err) {
      console.error('Manual check-in failed:', err);
    } finally {
      setCheckingManualCode(false);
    }
  };

  const filteredVenues = checkedInVenue
    ? venues.filter((venue) => venue.venueId !== checkedInVenue.venueId)
    : venues;

  return (
    <Page name="shows" className="shows-page">
      <VibeNavbar />

      {/* Hero Header */}
      <div className="page-header" style={{ paddingBottom: '8px' }}>
        <div className="page-header-title">Nearby Shows</div>
        <div className="page-header-sub">
          {loadingLocation
            ? 'Determining your location...'
            : coords
            ? `Located via ${locationSource === 'gps' ? 'GPS' : 'Network Estimate'} (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
            : 'Location unavailable'}
        </div>
      </div>

      {/* Premium Checked-In Status Card */}
      {checkedInVenue && (
        <div className="shows-checkedin-card">
          <div className="active-badge-top">
            <span className="pulse-indicator"></span>
            Current Show
          </div>
          <div className="checkedin-venue-name">{checkedInVenue.name}</div>
          <div className="checkedin-venue-id">Code: {checkedInVenue.venueId}</div>
          <div className="checkedin-actions-row">
            <button
              className="search-songbook-btn"
              onClick={() => f7.tab.show('#view-search')}
            >
              <i className="f7-icons" style={{ fontSize: '14px' }}>search</i>
              Search Songbook
            </button>
            <button
              className="leave-show-btn-card"
              onClick={() => {
                store.dispatch('checkOutVenue', undefined);
                f7.toast.create({
                  text: 'Checked out of show',
                  position: 'bottom',
                  closeTimeout: 1500,
                }).open();
              }}
            >
              Leave Show
            </button>
          </div>
        </div>
      )}

      {/* Manual Check-in Section */}
      <div className="manual-checkin-container">
        <div className="manual-checkin-title">Check In via Show Code</div>
        <div className="manual-checkin-row">
          <input
            className="manual-input"
            type="text"
            placeholder="Enter show code (e.g. wobblypenguin)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            disabled={checkingManualCode}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleManualCheckIn();
              }
            }}
          />
          <button
            className="manual-checkin-btn"
            onClick={handleManualCheckIn}
            disabled={checkingManualCode || !manualCode.trim()}
          >
            {checkingManualCode ? 'Verifying...' : 'Check In'}
          </button>
        </div>
      </div>

      {/* Distance Limit Selector */}
      <div className="range-selector-container">
        <span className="range-label">Search Distance Limit</span>
        <div className="range-select-wrap">
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={100}>100 miles</option>
          </select>
        </div>
      </div>

      {/* Loading indicator */}
      {(loadingLocation || loadingVenues) && (
        <Block className="text-align-center" style={{ marginTop: '40px' }}>
          <Preloader color="theme" size={32} />
          <div style={{ marginTop: '14px', color: 'var(--vibe-text-secondary)', fontSize: '14px' }}>
            Searching for nearby karaoke shows...
          </div>
        </Block>
      )}

      {/* Error state */}
      {error && !loadingLocation && !loadingVenues && (
        <Block className="text-align-center" style={{ marginTop: '40px', padding: '0 24px' }}>
          <i className="f7-icons" style={{ fontSize: '48px', color: '#ff7675' }}>exclamationmark_triangle_fill</i>
          <div style={{ marginTop: '14px', color: 'var(--vibe-text-secondary)', fontSize: '14px' }}>
            {error}
          </div>
          <Button
            fill
            onClick={fetchLocation}
            style={{ display: 'inline-block', marginTop: '20px', background: 'var(--vibe-accent-gradient)', borderRadius: '8px', padding: '4px 20px' }}
          >
            Retry Location Search
          </Button>
        </Block>
      )}

      {/* Shows List */}
      {!loadingLocation && !loadingVenues && !error && (
        <Block style={{ margin: '16px 0 32px' }}>
          {filteredVenues.length === 0 ? (
            <div className="text-align-center" style={{ padding: '40px 24px', color: 'var(--vibe-text-secondary)' }}>
              <i className="f7-icons" style={{ fontSize: '48px', color: 'var(--vibe-text-tertiary)', marginBottom: '12px' }}>placemark_slash</i>
              <div>No nearby active shows found within {range} miles.</div>
            </div>
          ) : (
            <div className="venues-container">
              {filteredVenues.map((venue) => {
                const isActive = checkedInVenue?.venueId === venue.venueId;
                return (
                  <div key={venue.venueId} className={`venue-card ${isActive ? 'active' : ''}`}>
                    <div className="venue-card-info">
                      <div className="venue-card-name-row">
                        <span className="venue-name">
                          {venue.showName}{venue.venueName ? ` @ ${venue.venueName}` : ''}
                        </span>
                        {isActive && (
                          <span className="active-badge">
                            <i className="f7-icons">checkmark_alt</i>
                          </span>
                        )}
                      </div>
                      <div className="venue-distance">
                        <i className="f7-icons">placemark</i>
                        {venue.city && venue.state ? `${venue.city}, ${venue.state} - ` : ''}
                        {venue.distance.toFixed(1)} Miles Away
                      </div>
                    </div>

                    <div className="venue-card-action">
                      {venue.accepting ? (
                        <button
                          className={`checkin-action-btn ${isActive ? 'current' : ''}`}
                          onClick={() => handleCheckIn(venue)}
                        >
                          {isActive ? 'Current Show' : 'Check In'}
                        </button>
                      ) : (
                        <button className="checkin-action-btn disabled" disabled>
                          Closed
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Block>
      )}
    </Page>
  );
}
