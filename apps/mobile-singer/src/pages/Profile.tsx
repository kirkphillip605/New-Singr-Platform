import { useState } from 'react';
import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard, GlassButton, GlassInput, SingrLogo } from '@singr/ui';
import { User, Sparkles } from 'lucide-react';
import { useSession, signOut, signIn, signUp, authClient } from '../lib/auth-client';

export default function ProfileView() {
  const { data: session } = useSession();
  const isRealUser = session?.user && !(session.user as any).isAnonymous;
  const isProfileIncomplete = isRealUser && (!(session.user as any).firstName || !(session.user as any).lastName);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [singerAbout, setSingerAbout] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const handleAuth = async (e: React.FormEvent) => {
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
          // Clear inputs
          setEmail('');
          setPassword('');
          setFirstName('');
          setLastName('');
        }
      } else {
        const res = await signIn.email({
          email,
          password,
        });

        if (res?.error) {
          setError(res.error.message || 'Invalid email or password.');
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
      setError("Please enter your email address in the input above first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const hostPortalUrl = import.meta.env.VITE_HOST_PORTAL_URL || "http://localhost:3011";
      await (authClient as any).forgetPassword({
        email,
        redirectTo: `${hostPortalUrl}/reset-password`,
      });
      alert(`A secure password reset link was sent to ${email}. Please check your inbox.`);
    } catch (err: any) {
      setError(err.message || "Failed to trigger password reset flow.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUpdatingProfile(true);

    try {
      await (authClient as any).updateUser({
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        singerAbout,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save profile details.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">👤 Singer Profile</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6 font-sans">
        {isRealUser ? (
          isProfileIncomplete ? (
            /* Logged In but Incomplete Profile */
            <GlassCard className="p-6 flex flex-col gap-4 animate-fade-in">
              <div>
                <h3 className="text-base font-extrabold text-white leading-tight mb-1">Complete Singer Profile</h3>
                <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed m-0">
                  Please provide your name and a brief bio to complete your singer registration.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-normal">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleCompleteProfile} className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">First Name</label>
                    <GlassInput
                      placeholder="Alice"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-1/2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Last Name</label>
                    <GlassInput
                      placeholder="Singer"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">About Me (Optional)</label>
                  <GlassInput
                    placeholder="Loves power ballads and 80s synth-pop..."
                    value={singerAbout}
                    onChange={(e) => setSingerAbout(e.target.value)}
                    className="py-2 text-xs"
                  />
                </div>

                <GlassButton type="submit" variant="primary" className="w-full py-2.5 mt-2 text-xs font-bold" disabled={updatingProfile}>
                  {updatingProfile ? "Saving Profile..." : "Save & Complete Profile"}
                </GlassButton>
              </form>
            </GlassCard>
          ) : (
            /* Logged In with Complete Profile */
            <div className="flex flex-col gap-6 animate-fade-in">
              <GlassCard className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {(session.user as any).name?.charAt(0).toUpperCase() || "S"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-white leading-tight mb-0.5">{(session.user as any).name}</h3>
                  <p className="text-xs text-[var(--singr-text-secondary)] m-0 truncate mb-1">{(session.user as any).email}</p>
                  {(session.user as any).singerAbout && (
                    <p className="text-[10px] text-orange-400/80 m-0 italic font-sans truncate">"{(session.user as any).singerAbout}"</p>
                  )}
                </div>
              </GlassCard>

              <div className="flex flex-col gap-3">
                <GlassButton 
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full py-3 text-xs font-bold border border-red-500/10 text-red-400 hover:bg-red-500/5 hover:border-red-500/30"
                >
                  Log Out Profile
                </GlassButton>
              </div>
            </div>
          )
        ) : (
          /* Anonymous guest & Auth Forms */
          <div className="flex flex-col gap-6">
            <div className="flex justify-center py-2 mb-2">
              <SingrLogo variant="white" className="h-10 w-auto object-contain" />
            </div>

            <GlassCard className="p-6 flex items-start gap-4">
              <div className="p-3 bg-gradient-to-tr from-[var(--singr-brand-start)]/20 to-[var(--singr-brand-end)]/20 border border-[var(--singr-accent-primary)]/10 text-[var(--singr-accent-primary)] rounded-xl shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white leading-tight mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[var(--singr-accent-secondary)] animate-pulse" /> Anonymous Guest
                </h3>
                <p className="text-xs text-[var(--singr-text-secondary)] leading-relaxed m-0">
                  You are utilizing a session-based anonymous profile. Register to save your favorites lists and request histories permanently!
                </p>
              </div>
            </GlassCard>

            {/* Email login/signup card */}
            <GlassCard className="p-6 flex flex-col gap-4">
              <h4 className="text-sm font-bold text-white mb-2">
                {isSignUp ? "Create Singer Account" : "Sign In with Email"}
              </h4>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-normal">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleAuth} className="flex flex-col gap-4">
                {isSignUp && (
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1 w-1/2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">First Name</label>
                      <GlassInput
                        placeholder="Alice"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="py-2 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-1/2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Last Name</label>
                      <GlassInput
                        placeholder="Singer"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="py-2 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Email Address</label>
                  <GlassInput
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="py-2 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password</label>
                    {!isSignUp && (
                      <button 
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-[9px] text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-sans font-bold"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <GlassInput
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="py-2 text-xs"
                  />
                </div>

                <GlassButton type="submit" variant="primary" className="w-full py-2.5 mt-2 text-xs font-bold" disabled={loading}>
                  {loading 
                    ? (isSignUp ? "Creating account..." : "Authenticating...") 
                    : (isSignUp ? "Sign Up as Singer" : "Sign In with Email")
                  }
                </GlassButton>
              </form>

              <div className="text-center text-[10px] text-[var(--singr-text-secondary)] mt-2">
                {isSignUp ? (
                  <p className="m-0">
                    Already have an account?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setIsSignUp(false); setError(""); }}
                      className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-bold"
                    >
                      Sign In
                    </button>
                  </p>
                ) : (
                  <p className="m-0">
                    Don't have an account?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setIsSignUp(true); setError(""); }}
                      className="text-[var(--singr-accent-primary)] hover:underline bg-transparent border-none cursor-pointer p-0 font-bold"
                    >
                      Sign Up
                    </button>
                  </p>
                )}
              </div>
            </GlassCard>

            <div className="flex flex-col gap-3 mt-2">
              <GlassButton
                onClick={() => signIn.social({ provider: 'google' })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>🌐</span> Sign In with Google
              </GlassButton>
              <GlassButton
                onClick={() => signIn.social({ provider: 'apple' })}
                variant="secondary"
                className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>🍎</span> Sign In with Apple
              </GlassButton>
            </div>
          </div>
        )}
      </Block>
    </Page>
  );
}
