import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, CheckCircle, AlertCircle, Camera, Smartphone, LogOut, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';

interface ProfileSettingsProps {
  session: any;
  isOfflineMode: boolean;
  onSignOut: () => Promise<void>;
  onSignIn: () => void;
  showToast: (msg: string) => void;
  isAppInstalled: boolean;
  deferredPrompt: any;
  onInstallApp: () => Promise<void>;
}

// 4 Pre-seeded premium avatar emoji presets for instant visual selection
const AVATAR_OPTIONS = ['📊', '💼', '🧘', '💸', '🍀', '☕'];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  session,
  isOfflineMode,
  showToast,
  isAppInstalled,
  deferredPrompt,
  onInstallApp,
  onSignOut,
  onSignIn,
}) => {
  const [fullName, setFullName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('📊');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (session?.user) {
      const meta = session.user.user_metadata || {};
      setFullName(meta.full_name || localStorage.getItem('ledger_user_fullname') || 'Ledger User');
      setAvatarEmoji(meta.avatar_emoji || localStorage.getItem('ledger_user_avatar') || '📊');
    }
  }, [session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setProfileSuccess(false);

    if (!fullName.trim()) {
      setValidationError('Name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      if (isOfflineMode) {
        localStorage.setItem('ledger_user_fullname', fullName);
        localStorage.setItem('ledger_user_avatar', avatarEmoji);
        
        // Mock profile update delay
        await new Promise((r) => setTimeout(r, 600));
        setProfileSuccess(true);
        showToast('Profile updated successfully.');
      } else {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            avatar_emoji: avatarEmoji,
          },
        });
        if (error) throw error;
        
        setProfileSuccess(true);
        showToast('Profile updated successfully.');
      }
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const triggerPasswordConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setPasswordSuccess(false);

    if (isOfflineMode) {
      setValidationError('Password changes are not available in offline sandbox mode.');
      return;
    }

    if (!oldPassword) {
      setValidationError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setValidationError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleUpdatePassword = async () => {
    setShowConfirmModal(false);
    setSavingPassword(true);
    try {
      // 1. Verify old password first by attempting a re-login check
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: oldPassword,
      });

      if (verifyError) {
        throw new Error('Current password verification failed. Please try again.');
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* Theme Toggle Card */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex justify-between items-center">
        <div>
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            Appearance
          </h3>
          <p className="text-[11px] text-ledgerText font-medium mt-0.5">
            Switch between light and dark themes
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Profile Details Card */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
          Profile Settings
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          {/* Avatar Selector Section */}
          <div className="flex flex-col items-center justify-center space-y-2.5 pb-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-ledgerElevated border border-ledgerBorder flex items-center justify-center text-3xl shadow-md select-none">
                {avatarEmoji}
              </div>
              <div className="absolute bottom-0 right-0 p-1 bg-ledgerMint text-[#0F1B1E] rounded-full border border-ledgerSurface cursor-pointer">
                <Camera className="w-3 h-3" />
              </div>
            </div>
            
            <div className="flex gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition border ${
                    avatarEmoji === emoji
                      ? 'border-ledgerMint bg-ledgerMint/5'
                      : 'border-ledgerBorder/40 hover:border-ledgerMuted bg-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Field */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 font-sans text-xs transition"
                placeholder="Your Name"
              />
            </div>
          </div>

          {/* Email Field (Read Only) */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1 opacity-70">
              Email Address (Read Only)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted/50">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                disabled
                value={session?.user?.email || 'offline@sandbox.local'}
                className="w-full bg-ledgerElevated/50 border border-ledgerBorder/40 text-ledgerText/50 rounded-lg py-2.5 pl-10 pr-4 font-sans text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            {savingProfile ? 'Updating Profile...' : 'Save Profile Changes'}
          </button>
        </form>

        {profileSuccess && (
          <p className="text-xs text-ledgerMint mt-1 flex items-center gap-1.5 justify-center animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            Profile updated successfully.
          </p>
        )}
      </div>

      {/* Password Reset Card */}
      {session && !isOfflineMode && (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
            Change Password
          </h3>

          <form onSubmit={triggerPasswordConfirm} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Current Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-10 font-sans text-xs transition"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted hover:text-ledgerText p-1 rounded"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                New Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-10 font-sans text-xs transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted hover:text-ledgerText p-1 rounded"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-10 font-sans text-xs transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted hover:text-ledgerText p-1 rounded"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full bg-ledgerElevated hover:bg-ledgerElevated/80 border border-ledgerBorder text-ledgerText font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
            >
              {savingPassword ? 'Updating Password...' : 'Update Account Password'}
            </button>
          </form>

          {passwordSuccess && (
            <p className="text-xs text-ledgerMint mt-1 flex items-center gap-1.5 justify-center animate-fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              Password updated successfully.
            </p>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fade-in">
          <div className="bg-ledgerSurface rounded-xl shadow-2xl p-6 w-[340px] max-w-full border border-ledgerBorder flex flex-col">
            <h3 className="text-sm font-bold text-ledgerText mb-1.5 uppercase tracking-wider">Confirm Password Change</h3>
            <p className="text-xs text-ledgerMuted mb-5 leading-normal">Are you sure you want to update your account password? You will need to log in again using the new credentials.</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-ledgerElevated hover:bg-ledgerElevated/70 text-ledgerMuted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePassword}
                className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-ledgerMint text-[#0F1B1E] hover:bg-ledgerMint/90 transition shadow-sm"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA App Installation Control Card */}
      {!isAppInstalled && deferredPrompt && (
        <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
          <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-ledgerMint" />
            Install Application
          </h3>
          <p className="text-xs text-ledgerMuted leading-normal">
            Install this ledger app on your desktop or mobile device for native full-screen view and quick access.
          </p>
          <button
            onClick={onInstallApp}
            className="w-full bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            Install App Launcher
          </button>
        </div>
      )}

      {/* Account Control Actions - Sign Out / Sign In */}
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
          Account Actions
        </h3>
        {session ? (
          <button
            onClick={onSignOut}
            className="w-full bg-ledgerCoral/10 hover:bg-ledgerCoral/20 border border-ledgerCoral/20 text-ledgerCoral font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out of Account
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full bg-ledgerMint text-[#0F1B1E] font-semibold py-2.5 rounded-lg text-xs hover:bg-ledgerMint/90 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            Sign In / Register Cloud Sync
          </button>
        )}
      </div>

      {validationError && (
        <p className="text-xs text-ledgerCoral mt-2 flex items-center gap-1.5 justify-center animate-fade-in bg-ledgerCoral/5 border border-ledgerCoral/10 py-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5" />
          {validationError}
        </p>
      )}

      {/* Signature Footer */}
      <footer className="pt-6 pb-2 text-center text-[10px] text-ledgerMuted select-none">
        Made with ❤️ by{' '}
        <a
          href="https://github.com/pushkar156"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#9C8EE3] font-bold hover:underline transition-all duration-150 bg-[#9C8EE3]/10 px-1.5 py-0.5 rounded"
        >
          Pushkar Gangurde
        </a>
      </footer>
    </div>
  );
};
