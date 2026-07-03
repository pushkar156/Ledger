import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Lock, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle';

interface ProfileSettingsProps {
  session: any;
  isOfflineMode: boolean;
  onSignOut: () => Promise<void>;
  showToast: (msg: string) => void;
}

// 4 Pre-seeded premium avatar emoji presets for instant visual selection
const AVATAR_OPTIONS = ['📊', '💼', '🧘', '💸', '🍀', '☕'];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  session,
  isOfflineMode,
  showToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('📊');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setPasswordSuccess(false);

    if (!newPassword || newPassword.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      if (isOfflineMode) {
        await new Promise((r) => setTimeout(r, 800));
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully.');
      } else {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw error;

        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password updated successfully.');
      }
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
      <div className="bg-ledgerSurface border border-ledgerBorder rounded-xl p-5 shadow-lg flex flex-col space-y-4">
        <h3 className="text-xs font-semibold text-ledgerMuted uppercase tracking-wider">
          Change Password
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ledgerMuted px-1">
              New Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ledgerMuted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 font-sans text-xs transition"
              />
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
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 font-sans text-xs transition"
              />
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

      {validationError && (
        <p className="text-xs text-ledgerCoral mt-2 flex items-center gap-1.5 justify-center animate-fade-in bg-ledgerCoral/5 border border-ledgerCoral/10 py-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5" />
          {validationError}
        </p>
      )}
    </div>
  );
};
