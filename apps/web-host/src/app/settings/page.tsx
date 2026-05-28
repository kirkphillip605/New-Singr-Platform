"use client";

import React, { useState, useEffect } from "react";
import { HostLayout } from "@/components/HostLayout";
import { GlassCard, GlassButton, GlassInput } from "@singr/ui";
import { useSession, authClient } from "@/lib/auth-client";
import { formatE164 } from "@singr/shared";
import { 
  User as UserIcon, 
  Lock, 
  Check, 
  Smartphone, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";

export default function HostSettingsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  
  // Profile states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Verification flow states
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // 2FA flow states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sync profile details when session is loaded
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setBusinessName(user.businessName || "");
      setPhoneNumber(user.phoneNumber || "");
      setPhoneVerified(!!user.phoneNumberVerified);
      setTwoFactorEnabled(!!user.twoFactorEnabled);
    }
  }, [session]);

  const handlePhoneBlur = () => {
    if (phoneNumber) {
      const formatted = formatE164(phoneNumber);
      setPhoneNumber(formatted);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formattedPhone = formatE164(phoneNumber);
      setPhoneNumber(formattedPhone);

      await authClient.updateUser({
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phoneNumber: formattedPhone,
        businessName,
      } as any);

      // Re-fetch session to get updated details
      const updated = await authClient.getSession();
      if (updated?.data?.user) {
        const u = updated.data.user as any;
        setPhoneVerified(!!u.phoneNumberVerified);
      }

      setSuccess("Profile settings updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings.");
    } finally {
      setLoading(false);
    }
  };

  // Send Verification SMS OTP
  const handleSendVerificationOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    if (!phoneNumber) {
      setError("Please save a mobile phone number before verification.");
      setLoading(false);
      return;
    }

    const formattedPhone = formatE164(phoneNumber);
    setPhoneNumber(formattedPhone);

    try {
      // better-auth phone number plugin: sendOtp
      const res = await authClient.phoneNumber.sendOtp({
        phoneNumber: formattedPhone,
      });

      if (res.error) {
        setError(res.error.message || "Failed to send verification SMS.");
      } else {
        setIsVerifyingPhone(true);
        setSuccess(`Verification code sent to ${formattedPhone}!`);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while sending SMS.");
    } finally {
      setLoading(false);
    }
  };

  // Verify SMS OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!otpCode || otpCode.length < 4) {
      setError("Please enter a valid verification code.");
      setLoading(false);
      return;
    }

    try {
      const formattedPhone = formatE164(phoneNumber);
      // better-auth phone number plugin: verify
      const res = await authClient.phoneNumber.verify({
        phoneNumber: formattedPhone,
        code: otpCode,
        updatePhoneNumber: true,
        disableSession: true,
      });

      if (res.error) {
        setError(res.error.message || "Invalid or expired verification code.");
      } else {
        setPhoneVerified(true);
        setIsVerifyingPhone(false);
        setOtpCode("");
        setSuccess("Phone number verified and linked successfully!");
        
        // Refresh session
        await authClient.getSession();
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify phone number.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle Two-Factor Authentication
  const handleToggle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!confirmPassword) {
      setError("Password is required to change security settings.");
      setLoading(false);
      return;
    }

    try {
      if (twoFactorEnabled) {
        // Disable 2FA
        const res = await authClient.twoFactor.disable({
          password: confirmPassword,
        });

        if (res.error) {
          setError(res.error.message || "Failed to disable 2FA.");
        } else {
          setTwoFactorEnabled(false);
          setShowPasswordPrompt(false);
          setConfirmPassword("");
          setSuccess("Two-Factor Authentication has been disabled.");
          await authClient.getSession();
        }
      } else {
        // Enable 2FA
        const res = await authClient.twoFactor.enable({
          password: confirmPassword,
        });

        if (res.error) {
          setError(res.error.message || "Failed to enable 2FA.");
        } else {
          setTwoFactorEnabled(true);
          setShowPasswordPrompt(false);
          setConfirmPassword("");
          setSuccess("Two-Factor Authentication via SMS is now enabled!");
          await authClient.getSession();
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <HostLayout title="Account Settings">
        <div className="flex justify-center items-center py-20 text-[var(--singr-text-secondary)] font-sans">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--singr-accent-primary)] mr-2" />
          Loading secure settings...
        </div>
      </HostLayout>
    );
  }

  return (
    <HostLayout title="Account Settings">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-sans">
            ✓ {success}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-[var(--singr-border)] pb-px">
          <button
            onClick={() => { setActiveTab("profile"); setError(""); setSuccess(""); }}
            className={`pb-4 px-2 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "profile" 
                ? "border-[var(--singr-accent-primary)] text-white" 
                : "border-transparent text-[var(--singr-text-secondary)] hover:text-white"
            }`}
          >
            <UserIcon className="w-4 h-4" /> Profile Info
          </button>
          <button
            onClick={() => { setActiveTab("security"); setError(""); setSuccess(""); }}
            className={`pb-4 px-2 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "security" 
                ? "border-[var(--singr-accent-primary)] text-white" 
                : "border-transparent text-[var(--singr-text-secondary)] hover:text-white"
            }`}
          >
            <Lock className="w-4 h-4" /> Security & 2FA
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Form Column */}
            <GlassCard className="p-8 md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-6">Edit Profile Ledger</h3>
              
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 font-sans text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">First Name</label>
                    <GlassInput
                      placeholder="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Last Name</label>
                    <GlassInput
                      placeholder="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Business / KJ Name</label>
                  <GlassInput
                    placeholder="Business Name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Mobile Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <GlassInput
                        type="tel"
                        placeholder="+16059560173"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        onBlur={handlePhoneBlur}
                        required
                      />
                    </div>
                    {phoneVerified ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-3 rounded-xl border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : (
                      <GlassButton 
                        type="button" 
                        variant="secondary" 
                        onClick={handleSendVerificationOtp}
                        disabled={loading || !phoneNumber}
                        className="py-2.5 text-[10px] uppercase font-bold tracking-wider"
                      >
                        Verify Number
                      </GlassButton>
                    )}
                  </div>
                </div>

                <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold" disabled={loading}>
                  {loading ? "Saving Changes..." : "Save Settings Ledger"}
                </GlassButton>
              </form>
            </GlassCard>

            {/* Verification & Meta Column */}
            <div className="flex flex-col gap-6">
              
              {/* Phone OTP Verification Box */}
              {isVerifyingPhone && (
                <GlassCard className="p-6 border border-[var(--singr-accent-primary)]/20">
                  <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[var(--singr-accent-primary)]" />
                    Verify Phone OTP
                  </h4>
                  <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-4 leading-relaxed">
                    Enter the 6-digit verification code sent to your mobile phone to complete linking.
                  </p>

                  <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 font-sans">
                    <GlassInput
                      type="text"
                      maxLength={6}
                      placeholder="******"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="text-center tracking-widest font-mono text-lg"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <GlassButton 
                        type="button" 
                        variant="secondary" 
                        onClick={() => setIsVerifyingPhone(false)}
                        className="py-2 text-[10px] uppercase font-bold tracking-wider"
                      >
                        Cancel
                      </GlassButton>
                      <GlassButton 
                        type="submit" 
                        variant="primary"
                        className="py-2 text-[10px] uppercase font-bold tracking-wider"
                        disabled={loading}
                      >
                        Verify Code
                      </GlassButton>
                    </div>
                  </form>
                </GlassCard>
              )}

              {/* Account Meta Information */}
              <GlassCard className="p-6">
                <h4 className="text-sm font-bold text-white mb-4">Account Security Status</h4>
                <ul className="list-none p-0 m-0 flex flex-col gap-4 font-sans text-xs">
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--singr-text-secondary)]">Email Verified</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${session?.user?.emailVerified ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                      {session?.user?.emailVerified ? "Verified" : "Pending"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--singr-text-secondary)]">Phone Linked</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${phoneVerified ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"}`}>
                      {phoneVerified ? "Linked" : "Unverified"}
                    </span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[var(--singr-text-secondary)]">2FA Enforced</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${twoFactorEnabled ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-slate-500/10"}`}>
                      {twoFactorEnabled ? "Active" : "Disabled"}
                    </span>
                  </li>
                </ul>
              </GlassCard>
            </div>
          </div>
        )}

        {/* SECURITY & 2FA TAB */}
        {activeTab === "security" && (
          <GlassCard className="p-8 max-w-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[var(--singr-accent-primary)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Two-Factor Authentication (2FA)</h3>
                <p className="text-xs text-[var(--singr-text-secondary)] font-sans max-w-md leading-relaxed">
                  Add an extra layer of security to your host console by requiring a verification code sent to your mobile phone on every sign-in.
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--singr-border)] my-6"></div>

            {!phoneVerified ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-400 font-sans text-xs">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <h5 className="font-bold text-white mb-1">Phone Verification Required</h5>
                  <p className="text-[var(--singr-text-secondary)] leading-relaxed m-0">
                    You must enter and verify your mobile phone number in the <strong>Profile Info</strong> tab before you can enable Two-Factor Authentication.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="font-sans">
                    <p className="font-semibold text-white text-sm">SMS OTP Authentication</p>
                    <p className="text-xs text-[var(--singr-text-secondary)] mt-0.5">Verify login access via code sent to {phoneNumber}</p>
                  </div>
                  
                  {!showPasswordPrompt && (
                    <GlassButton 
                      variant={twoFactorEnabled ? "secondary" : "primary"}
                      onClick={() => setShowPasswordPrompt(true)}
                      className="text-xs py-2 px-4"
                      disabled={loading}
                    >
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </GlassButton>
                  )}
                </div>

                {showPasswordPrompt && (
                  <form onSubmit={handleToggle2FA} className="p-6 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-4 font-sans text-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-white">Confirm Your Current Password</label>
                      <p className="text-[10px] text-[var(--singr-text-secondary)]">To prevent unauthorized changes, please confirm your host console password.</p>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="flex gap-2 justify-end mt-2">
                      <GlassButton 
                        type="button" 
                        variant="secondary" 
                        onClick={() => { setShowPasswordPrompt(false); setConfirmPassword(""); }}
                        className="py-2 px-4 text-xs"
                      >
                        Cancel
                      </GlassButton>
                      <GlassButton 
                        type="submit" 
                        variant={twoFactorEnabled ? "secondary" : "primary"}
                        className="py-2 px-4 text-xs font-bold border border-red-500/10 hover:border-red-500/30 text-red-400"
                        disabled={loading}
                      >
                        {loading 
                          ? "Verifying Ledger..." 
                          : (twoFactorEnabled ? "Disable Security 2FA" : "Enforce Security 2FA")
                        }
                      </GlassButton>
                    </div>
                  </form>
                )}
              </div>
            )}
          </GlassCard>
        )}

      </div>
    </HostLayout>
  );
}
