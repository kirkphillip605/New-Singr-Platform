import { useState, useEffect } from 'react';
import {
  f7ready,
  App,
  View,
  Views,
  Toolbar,
  Link,
  Panel,
  Page,
  Navbar,
  NavTitle,
  NavRight,
  Popup,
  Block,
  Preloader,
  f7,
  useStore,
} from 'framework7-react';
import routes from '../lib/routes';
import store from '../lib/store';
import RequestSheet from './RequestSheet';
import { useSession, signOut, signIn, signUp, authClient } from '../lib/auth-client';

const SINGER_HISTORY_KEY = 'singr_request_history';

interface HistoryRecord {
  id: string;
  songTitle: string;
  songArtist: string;
  venueName: string;
  submittedAt: string;
  keyChange: number;
}

const LeftPanelContent = ({ onOpenHistory }: { onOpenHistory: () => void }) => {
  const checkedInVenue = useStore('checkedInVenue') as any;

  const handleLeaveShow = () => {
    store.dispatch('checkOutVenue', undefined);
    f7.tab.show('#view-shows');
    f7.panel.close('left');
    f7.toast.create({
      text: 'Checked out of show',
      position: 'bottom',
      closeTimeout: 1500,
    } as any).open();
  };

  return (
    <Page name="left-panel" className="left-panel-page">
      <Navbar>
        <NavTitle>Menu</NavTitle>
        <NavRight>
          <Link iconF7="multiply" panelClose />
        </NavRight>
      </Navbar>

      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 44px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Checked-in Venue Card */}
          <div className="panel-card">
            <div className="panel-card-title">Current Show</div>
            {checkedInVenue ? (
              <div className="venue-status-checkedin">
                <div className="venue-badge">
                  <i className="f7-icons" style={{ fontSize: '13px', color: '#fff', marginRight: '4px' }}>checkmark_seal_fill</i>
                  Checked In
                </div>
                <div className="venue-name">{checkedInVenue.name}</div>
                <div className="venue-id-sub">Code: {checkedInVenue.venueId}</div>
                <button className="leave-show-btn" onClick={handleLeaveShow}>
                  <i className="f7-icons" style={{ fontSize: '16px', marginRight: '4px' }}>arrow_left_square</i> Leave Show
                </button>
              </div>
            ) : (
              <div className="venue-status-empty">
                <div className="empty-text">Not checked in to any show</div>
                <button className="go-to-shows-btn" onClick={() => { f7.tab.show('#view-shows'); f7.panel.close('left'); }}>
                  Find a Show
                </button>
              </div>
            )}
          </div>

          {/* Menu Options */}
          <div className="menu-list" style={{ marginTop: '24px' }}>
            <a href="#" className="menu-item-link" onClick={(e) => { e.preventDefault(); f7.tab.show('#view-shows'); f7.panel.close('left'); }}>
              <i className="f7-icons">placemark</i>
              <span>Find Shows</span>
            </a>
            <a href="#" className="menu-item-link" onClick={(e) => { e.preventDefault(); f7.tab.show('#view-favorites'); f7.panel.close('left'); }}>
              <i className="f7-icons">heart</i>
              <span>Favorite Songs</span>
            </a>
            <a href="#" className="menu-item-link" onClick={(e) => { e.preventDefault(); f7.panel.close('left'); onOpenHistory(); }}>
              <i className="f7-icons">clock</i>
              <span>Request History</span>
            </a>
          </div>
        </div>

        {/* Sticky Settings Section */}
        <div className="sticky-settings-panel">
          <a href="#" className="menu-item-link" onClick={(e) => { e.preventDefault(); f7.panel.close('left'); f7.panel.open('right'); }}>
            <i className="f7-icons">gear_alt</i>
            <span>Settings / Profile</span>
          </a>
        </div>
      </div>
    </Page>
  );
};

const ProfilePanelContent = () => {
  const { data: session, isPending } = useSession();
  const singerName = useStore('singerName') as string | undefined;
  const [singerInput, setSingerInput] = useState(singerName || '');

  // Form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    setSingerInput(singerName || '');
  }, [singerName]);

  const handleSaveName = async () => {
    store.dispatch('setSingerName', singerInput.trim());

    if (session?.user && !(session.user as any).isAnonymous) {
      setUpdatingProfile(true);
      try {
        await (authClient as any).updateUser({
          singerAbout: singerInput.trim(),
        });
      } catch (err: any) {
        console.error('Failed to sync singerName to profile:', err);
      } finally {
        setUpdatingProfile(false);
      }
    }

    f7.toast.create({
      text: 'Singer name saved!',
      position: 'bottom',
      closeTimeout: 1500,
    } as any).open();
  };

  const handleLogout = async () => {
    f7.dialog.preloader('Logging out...');
    try {
      await signOut();
      f7.panel.close('right');
    } catch (err) {
      console.error(err);
    } finally {
      f7.dialog.close();
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp.email({
          email,
          password,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          roles: ['singer'],
        } as any);

        if (res?.error) {
          setError(res.error.message || 'Failed to register account.');
        } else {
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
          f7.toast.create({
            text: 'Account created! Welcome!',
            position: 'bottom',
            closeTimeout: 2000,
          } as any).open();
        }
      } else {
        const res = await signIn.email({
          email,
          password,
        });

        if (res?.error) {
          setError(res.error.message || 'Invalid email or password.');
        } else {
          setEmail('');
          setPassword('');
          f7.toast.create({
            text: 'Signed in successfully!',
            position: 'bottom',
            closeTimeout: 2000,
          } as any).open();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email in the field above first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const hostPortalUrl = import.meta.env.VITE_HOST_PORTAL_URL || 'http://localhost:3011';
      await (authClient as any).forgetPassword({
        email,
        redirectTo: `${hostPortalUrl}/reset-password`,
      });
      alert(`A secure password reset link was sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger reset flow.');
    } finally {
      setLoading(false);
    }
  };

  const isRealUser = session?.user && !(session.user as any).isAnonymous;

  return (
    <Page name="profile-panel" className="profile-panel-page">
      <Navbar>
        <NavTitle>{isRealUser ? 'Profile' : 'Account'}</NavTitle>
        <NavRight>
          <Link iconF7="multiply" panelClose />
        </NavRight>
      </Navbar>

      <div style={{ padding: '16px', height: 'calc(100% - 44px)', boxSizing: 'border-box', overflowY: 'auto' }}>
        {isPending ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Preloader />
          </div>
        ) : isRealUser ? (
          <div>
            {/* Signed-in Profile Card */}
            <div className="profile-card">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  <i className="f7-icons">person_crop_circle_fill</i>
                </div>
              </div>
              <div className="profile-name">{(session.user as any).name || 'Singer'}</div>
              <div className="profile-email">{(session.user as any).email}</div>
              
              {/* Singer Name Editing */}
              <div className="singer-name-edit-section">
                <div className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Singer Name</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Enter singer name"
                    value={singerInput}
                    onChange={(e) => setSingerInput(e.target.value)}
                    style={{ flex: 1, margin: 0, height: '36px' }}
                    id="singer-input-panel"
                  />
                  <button className="save-singer-btn" onClick={handleSaveName} disabled={updatingProfile}>
                    {updatingProfile ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <div className="menu-list" style={{ marginTop: '24px' }}>
              <a href="#" className="menu-item-link logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
                <i className="f7-icons">arrow_left_square</i>
                <span>Log Out</span>
              </a>
            </div>
          </div>
        ) : (
          /* Authentication Forms */
          <div className="logged-out-state" style={{ textAlign: 'left', padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div className="avatar-placeholder" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'var(--vibe-glass-bg)', border: '1px solid var(--vibe-glass-border)', fontSize: '28px', color: 'var(--vibe-text-tertiary)', marginBottom: '12px' }}>
                <i className="f7-icons">person_crop_circle</i>
              </div>
              <div className="logged-out-title" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--vibe-text-primary)' }}>Welcome to Singr</div>
              <div className="logged-out-sub" style={{ fontSize: '12px', color: 'var(--vibe-text-tertiary)', marginTop: '4px' }}>Sign in to save your requests history permanently.</div>
            </div>

            {error && (
              <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--vibe-error-bg)', border: '1px solid var(--vibe-error)', color: 'var(--vibe-error)', fontSize: '12px', marginBottom: '12px' }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isSignUp && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vibe-text-secondary)' }}>First Name</label>
                    <input className="form-input" style={{ marginTop: '4px' }} type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vibe-text-secondary)' }}>Last Name</label>
                    <input className="form-input" style={{ marginTop: '4px' }} type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vibe-text-secondary)' }}>Email Address</label>
                <input className="form-input" style={{ marginTop: '4px' }} type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--vibe-text-secondary)' }}>Password</label>
                  {!isSignUp && (
                    <button type="button" onClick={handleForgotPassword} style={{ background: 'none', border: 'none', color: 'var(--vibe-accent)', fontSize: '9px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                      Forgot?
                    </button>
                  )}
                </div>
                <input className="form-input" style={{ marginTop: '4px' }} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <button className="auth-btn-signin" type="submit" style={{ width: '100%', height: '38px', borderRadius: 'var(--vibe-radius-sm)', border: 'none', background: 'var(--vibe-accent-gradient)', color: '#fff', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }} disabled={loading}>
                {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>

              <button className="auth-btn-signup" type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{ width: '100%', height: '38px', borderRadius: 'var(--vibe-radius-sm)', border: '1px solid var(--vibe-glass-border)', background: 'var(--vibe-glass-bg)', color: 'var(--vibe-text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                {isSignUp ? 'Go to Sign In' : 'Create Account'}
              </button>
            </form>

            {/* Social logins */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => signIn.social({ provider: 'google' })} style={{ width: '100%', height: '36px', borderRadius: 'var(--vibe-radius-sm)', border: '1px solid var(--vibe-glass-border)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Sign In with Google
              </button>
            </div>
          </div>
        )}

        {/* App Info Footer */}
        <div style={{ textAlign: 'center', padding: '40px 16px 24px' }}>
          <div style={{
            fontSize: '11px',
            color: 'var(--vibe-text-tertiary)',
            lineHeight: 1.6,
          }}>
            Singr Mobile App v2.0.0<br />
            Powered by Singr API
          </div>
        </div>
      </div>
    </Page>
  );
};

const AppContent = () => {
  const requestSheetOpen = useStore('requestSheetOpen');
  const requestSheetSong = useStore('requestSheetSong');

  return (
    <>
      <Views tabs className="safe-areas">
        {/* Bottom Tab Bar */}
        <Toolbar tabbar icons bottom className="tabbar-icons">
          <Link
            tabLink="#view-shows"
            tabLinkActive
            iconF7="calendar"
            text="Shows"
          />
          <Link
            tabLink="#view-search"
            iconF7="search"
            text="Search"
          />
          <Link
            tabLink="#view-favorites"
            iconF7="heart"
            text="Favorites"
          />
          <Link
            tabLink="#view-live"
            iconF7="play_circle"
            text="Live"
          />
        </Toolbar>

        {/* Tab Views */}
        <View
          id="view-shows"
          main
          tab
          tabActive
          url="/shows/"
        />
        <View
          id="view-search"
          tab
          url="/search/"
        />
        <View
          id="view-favorites"
          tab
          url="/favorites/"
        />
        <View
          id="view-live"
          tab
          url="/live/"
        />
      </Views>

      {/* Global Request Sheet */}
      <RequestSheet
        opened={requestSheetOpen as boolean}
        song={requestSheetSong as any}
        onClose={() => store.dispatch('closeRequestSheet', undefined)}
      />
    </>
  );
};

export default function AppContainer() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    // Intercept storage sync events to load local history
    const loadHistory = () => {
      const saved = localStorage.getItem(SINGER_HISTORY_KEY);
      if (saved) {
        try {
          setHistoryItems(JSON.parse(saved));
        } catch {
          setHistoryItems([]);
        }
      }
    };
    loadHistory();
    window.addEventListener('storage', loadHistory);
    return () => window.removeEventListener('storage', loadHistory);
  }, []);

  const handleOpenHistory = () => {
    const saved = localStorage.getItem(SINGER_HISTORY_KEY);
    if (saved) {
      try {
        setHistoryItems(JSON.parse(saved));
      } catch {
        setHistoryItems([]);
      }
    }
    setHistoryOpen(true);
  };

  const f7params = {
    name: 'Singr App',
    theme: 'ios',
    darkMode: true,
    colors: {
      primary: '#ff5e36',
    },
    touch: {
      tapHold: true,
    },
    store: store,
    routes: routes,
  };

  f7ready(() => {
    // F7 is ready
  });

  return (
    <App {...f7params}>
      {/* Slide-out Left Menu Panel */}
      <Panel left cover id="panel-left">
        <View>
          <LeftPanelContent onOpenHistory={handleOpenHistory} />
        </View>
      </Panel>

      {/* Slide-out Profile Panel */}
      <Panel right cover id="panel-profile">
        <View>
          <ProfilePanelContent />
        </View>
      </Panel>

      <AppContent />

      {/* History Popup */}
      <Popup opened={historyOpen} onPopupClosed={() => setHistoryOpen(false)} className="dark-popup">
        <Page>
          <Navbar>
            <NavTitle>Request History</NavTitle>
            <NavRight>
              <Link iconF7="multiply" popupClose />
            </NavRight>
          </Navbar>
          
          <Block style={{ padding: '0 16px' }}>
            {historyItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 32px', color: 'var(--vibe-text-tertiary)' }}>
                <i className="f7-icons" style={{ fontSize: '48px', marginBottom: '12px' }}>clock</i>
                <div>No requests history found. Submit requests to track them here!</div>
              </div>
            ) : (
              <div className="song-list" style={{ padding: 0 }}>
                {historyItems.map((item) => (
                  <div key={item.id} className="song-item" style={{ cursor: 'default' }}>
                    <div className="favorite-btn" style={{ color: 'var(--vibe-accent)' }}>
                      <i className="f7-icons">checkmark_circle_fill</i>
                    </div>
                    <div className="song-item-info">
                      <div className="song-title">{item.songTitle}</div>
                      <div className="song-artist" style={{ color: 'var(--vibe-text-secondary)' }}>
                        {item.songArtist}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--vibe-text-tertiary)', marginTop: '4px' }}>
                        {item.venueName} • Pitch: {item.keyChange > 0 ? `+${item.keyChange}` : item.keyChange}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--vibe-text-tertiary)' }}>
                      {new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Block>
        </Page>
      </Popup>
    </App>
  );
}
