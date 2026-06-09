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
  Loader2,
  Link
} from "lucide-react";

export default function HostSettingsPage() {
  const { data: session, isPending: sessionLoading, refetch } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const disableSmsAuth = process.env.NEXT_PUBLIC_DISABLE_SMS_AUTH === "true";
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "linked">("profile");
  
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

  // Linked accounts states
  const [accounts, setAccounts] = useState<any[]>([]);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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
      fetchAccounts();
    }
  }, [session]);

  const fetchAccounts = async () => {
    try {
      const res = await authClient.listAccounts();
      if (res?.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

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

      const response = await fetch(`${apiUrl}/api/v1/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          businessName,
          phoneNumber: formattedPhone,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile.");
      }

      // Re-fetch session to get updated details
      const updated = await authClient.getSession({
        query: {
          disableCookieCache: true,
        }
      });
      await refetch();
      
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to change password.");
      }

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/users/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to set password.");
      }

      setSuccess("Password configured successfully!");
      setNewPassword("");
      setConfirmNewPassword("");
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || "Failed to set password.");
    } finally {
      setLoading(false);
    }
  };

  // Social account linking/unlinking
  const handleLinkGoogle = async () => {
    setError("");
    setSuccess("");
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      setError(err.message || "Failed to initiate Google link.");
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    if (!confirm(`Are you sure you want to unlink your ${providerId} account?`)) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await authClient.unlinkAccount({
        providerId,
      });
      if (res.error) {
        setError(res.error.message || "Failed to unlink account.");
      } else {
        setSuccess(`Successfully unlinked ${providerId} account.`);
        await fetchAccounts();
      }
    } catch (err: any) {
      setError(err.message || "Failed to unlink account.");
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
            <Lock className="w-4 h-4" /> Security & Password
          </button>
          <button
            onClick={() => { setActiveTab("linked"); setError(""); setSuccess(""); }}
            className={`pb-4 px-2 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all bg-transparent border-none cursor-pointer ${
              activeTab === "linked" 
                ? "border-[var(--singr-accent-primary)] text-white" 
                : "border-transparent text-[var(--singr-text-secondary)] hover:text-white"
            }`}
          >
            <Link className="w-4 h-4" /> Linked Accounts
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
                    // Make sure it doesn't block updates
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
                        required={!disableSmsAuth}
                      />
                    </div>
                    {!disableSmsAuth && (
                      phoneVerified ? (
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
                      )
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
              {isVerifyingPhone && !disableSmsAuth && (
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
                  {!disableSmsAuth && (
                    <>
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
                    </>
                  )}
                </ul>
              </GlassCard>
            </div>
          </div>
        )}

        {/* SECURITY & PASSWORD TAB */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-8 md:col-span-2">
              {accounts.some(acc => acc.providerId === "credential" || acc.provider === "credential") ? (
                /* CHANGE PASSWORD FORM */
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Change Security Password</h3>
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Current Password</label>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">New Password (min 8 chars)</label>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Confirm New Password</label>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold" disabled={loading}>
                      {loading ? "Changing Password..." : "Update Password"}
                    </GlassButton>
                  </form>
                </div>
              ) : (
                /* SET PASSWORD FORM */
                <div>
                  <h3 className="text-lg font-bold text-white mb-6">Create Account Password</h3>
                  <p className="text-xs text-[var(--singr-text-secondary)] mb-6 font-sans leading-relaxed">
                    You currently log in using a social identity provider. Create a password so you can also sign in with your email address directly.
                  </p>
                  <form onSubmit={handleSetPassword} className="flex flex-col gap-4 font-sans text-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">New Password (min 8 chars)</label>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Confirm New Password</label>
                      <GlassInput
                        type="password"
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <GlassButton type="submit" variant="primary" className="w-full py-3 mt-4 text-xs font-bold" disabled={loading}>
                      {loading ? "Configuring Password..." : "Set Password"}
                    </GlassButton>
                  </form>
                </div>
              )}
            </GlassCard>

            {/* 2FA Column */}
            {!disableSmsAuth && (
              <GlassCard className="p-6 h-fit">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--singr-accent-primary)]" />
                  Two-Factor Auth
                </h4>
                <p className="text-xs text-[var(--singr-text-secondary)] font-sans mb-4 leading-relaxed">
                  Require a mobile verification code on sign-in.
                </p>
                
                {!phoneVerified ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-sans text-[11px] leading-relaxed">
                    Verify your phone number in <strong>Profile Info</strong> first to enable 2FA.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs text-[var(--singr-text-secondary)] font-sans">
                      SMS 2FA: <span className={twoFactorEnabled ? "text-emerald-400 font-semibold" : "text-slate-400 font-semibold"}>{twoFactorEnabled ? "Active" : "Disabled"}</span>
                    </div>
                    
                    {!showPasswordPrompt ? (
                      <GlassButton 
                        variant={twoFactorEnabled ? "secondary" : "primary"}
                        onClick={() => setShowPasswordPrompt(true)}
                        className="text-[10px] py-2 w-full uppercase font-bold tracking-wider"
                        disabled={loading}
                      >
                        {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                      </GlassButton>
                    ) : (
                      <form onSubmit={handleToggle2FA} className="flex flex-col gap-3 mt-2 font-sans text-xs">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--singr-text-secondary)]">Password</label>
                        <GlassInput
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="py-1.5"
                        />
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <GlassButton 
                            type="button" 
                            variant="secondary" 
                            onClick={() => { setShowPasswordPrompt(false); setConfirmPassword(""); }}
                            className="py-1.5 text-[9px] uppercase font-bold tracking-wider"
                          >
                            Cancel
                          </GlassButton>
                          <GlassButton 
                            type="submit" 
                            variant={twoFactorEnabled ? "secondary" : "primary"}
                            className="py-1.5 text-[9px] uppercase font-bold tracking-wider"
                            disabled={loading}
                          >
                            Confirm
                          </GlassButton>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </GlassCard>
            )}
          </div>
        )}

        {/* LINKED ACCOUNTS TAB */}
        {activeTab === "linked" && (
          <GlassCard className="p-8 max-w-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[var(--singr-accent-primary)]">
                <Link className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Connected Social Identities</h3>
                <p className="text-xs text-[var(--singr-text-secondary)] font-sans max-w-md leading-relaxed">
                  Link social identity providers to sign in to your host console with one click.
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--singr-border)] my-6"></div>

            <div className="flex flex-col gap-4 font-sans text-sm">
              <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-semibold text-white">Google Integration</p>
                  <p className="text-xs text-[var(--singr-text-secondary)] mt-0.5">
                    {accounts.some(acc => acc.providerId === "google" || acc.provider === "google")
                      ? "Connected to Google Identity Ledger"
                      : "Not connected"
                    }
                  </p>
                </div>
                
                {accounts.some(acc => acc.providerId === "google" || acc.provider === "google") ? (
                  <GlassButton
                    variant="secondary"
                    onClick={() => handleUnlinkAccount("google")}
                    className="text-xs py-2 px-4 border border-red-500/10 hover:border-red-500/30 text-red-400 font-bold"
                    disabled={loading}
                  >
                    Unlink
                  </GlassButton>
                ) : (
                  <GlassButton
                    variant="primary"
                    onClick={handleLinkGoogle}
                    className="text-xs py-2 px-4 font-bold"
                    disabled={loading}
                  >
                    Link Google
                  </GlassButton>
                )}
              </div>
            </div>
          </GlassCard>
        )}

      </div>
    </HostLayout>
  );
}
