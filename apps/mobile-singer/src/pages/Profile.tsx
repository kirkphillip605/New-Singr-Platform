import { Page, Navbar, NavTitle, Block } from 'framework7-react';
import { GlassCard, GlassButton } from '@singr/ui';
import { User, Sparkles } from 'lucide-react';
import { useSession, signOut, signIn } from '../lib/auth-client';

export default function ProfileView() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Page>
      <Navbar className="glass-panel border-x-0 border-t-0 rounded-none bg-[var(--singr-bg-secondary)]/10 backdrop-blur-md">
        <NavTitle className="text-white font-bold font-sans">👤 Singer Profile</NavTitle>
      </Navbar>

      <Block className="m-0 p-6 flex flex-col gap-6 font-sans">
        {session?.user ? (
          /* Logged In */
          <div className="flex flex-col gap-6">
            <GlassCard className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--singr-brand-start)] to-[var(--singr-brand-end)] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {session.user.name?.charAt(0).toUpperCase() || "S"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-extrabold text-white leading-tight mb-0.5">{session.user.name}</h3>
                <p className="text-xs text-[var(--singr-text-secondary)] m-0 truncate">{session.user.email}</p>
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
        ) : (
          /* Anonymous guest */
          <div className="flex flex-col gap-6">
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

            <div className="flex flex-col gap-3">
              <GlassButton
                onClick={() => signIn.social({ provider: 'google' })}
                variant="primary"
                className="w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>🌐</span> Sign In with Google
              </GlassButton>
              <GlassButton
                onClick={() => signIn.social({ provider: 'apple' })}
                variant="secondary"
                className="w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5"
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
