import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider, hasFirebaseCreds } from '../lib/firebase';
import { Lock, Mail, Loader2, Eye, EyeOff, User } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
  hideHeader?: boolean;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, hideHeader = false }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!hasFirebaseCreds) {
      setError('Firebase credentials are not configured in .env.local.');
      setLoading(false);
      return;
    }

    try {
      if (isForgotPassword) {
        if (!email.trim()) throw new Error('Please enter your email address.');
        await sendPasswordResetEmail(auth, email.trim());
        setError('Password reset email sent! Please check your inbox.');
      } else if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (res.user) {
          await updateProfile(res.user, {
            displayName: fullName.trim(),
            photoURL: '📊'
          });
          localStorage.setItem('ledger_user_fullname', fullName.trim());
          localStorage.setItem('ledger_user_avatar', '📊');
        }
        onAuthSuccess();
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onAuthSuccess();
      }
    } catch (err: any) {
      let msg = err.message || 'An error occurred during authentication.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);

    if (Capacitor.isNativePlatform()) {
      setError('Google Sign-In is only supported in web browsers. On the Android mobile app, please log in with your Email and Password below.');
      setGoogleLoading(false);
      return;
    }

    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        if (res.user.displayName) {
          localStorage.setItem('ledger_user_fullname', res.user.displayName);
        }
        onAuthSuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-supported-in-this-environment' || err.message?.includes('disallowed_useragent') || err.code === 'auth/popup-blocked') {
        setError('Google popups are blocked inside the mobile view. Please sign in using your Email & Password below.');
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderFormContent = () => (
    <div className="space-y-4">
      {/* 1-Click Google Sign In */}
      {!isForgotPassword && (
        <>
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
            className="w-full bg-ledgerElevated hover:bg-ledgerElevated/80 border border-ledgerBorder text-ledgerText font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-ledgerMint" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
            {Capacitor.isNativePlatform() && (
              <span className="text-[10px] bg-ledgerSurface border border-ledgerBorder px-1.5 py-0.5 rounded text-ledgerMuted ml-1">
                Web only
              </span>
            )}
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-ledgerBorder w-full"></div>
            <span className="bg-ledgerSurface px-2 text-[10px] uppercase tracking-wider text-ledgerMuted select-none">
              or with email
            </span>
            <div className="border-t border-ledgerBorder w-full"></div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div className="animate-slide-up">
            <label className="block text-xs font-semibold uppercase tracking-wider text-ledgerMuted mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 text-sm transition focus:border-ledgerMint focus:ring-1 focus:ring-ledgerMint"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-ledgerMuted mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-4 text-sm transition focus:border-ledgerMint focus:ring-1 focus:ring-ledgerMint"
            />
          </div>
        </div>

        {!isForgotPassword && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ledgerMuted">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="text-[11px] text-ledgerMint hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isForgotPassword}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-10 text-sm transition focus:border-ledgerMint focus:ring-1 focus:ring-ledgerMint"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ledgerMuted hover:text-ledgerText p-1 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="animate-slide-up">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ledgerMuted mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required={isSignUp}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-ledgerElevated border border-ledgerBorder text-ledgerText rounded-lg py-2.5 pl-10 pr-10 text-sm transition focus:border-ledgerMint focus:ring-1 focus:ring-ledgerMint"
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
            )}
          </div>
        )}

        {/* Status / Error Message */}
        {error && (
          <div className="flex flex-col gap-2">
            <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
              error.includes('sent')
                ? 'bg-ledgerMint/10 border-ledgerMint/20 text-ledgerMint'
                : 'bg-ledgerCoral/10 border-ledgerCoral/20 text-ledgerCoral'
            }`}>
              {error}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full bg-ledgerMint text-[#0F1B1E] font-medium py-2.5 rounded-lg text-sm hover:bg-ledgerMint/90 active:transform active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            isForgotPassword ? 'Send Reset Link' : isSignUp ? 'Create Account' : 'Sign In'
          )}
        </button>

        {/* Toggle link */}
        <div className="text-center mt-6 flex flex-col gap-2">
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
              }}
              className="text-xs text-ledgerMuted hover:text-ledgerText transition underline underline-offset-4"
            >
              Back to Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-xs text-ledgerMuted hover:text-ledgerText transition underline underline-offset-4"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>
      </form>
    </div>
  );

  if (hideHeader) {
    return renderFormContent();
  }

  return (
    <div className="min-h-screen bg-ledgerBg flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-ledgerSurface border border-ledgerBorder rounded-xl p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img 
            src="/favicon.png" 
            alt="Ledger Logo" 
            className="inline-block w-14 h-14 rounded-2xl shadow-lg border border-ledgerBorder/45 mb-3"
          />
          <h1 className="text-2xl font-bold tracking-tight text-ledgerText">Ledger</h1>
          <p className="text-sm text-ledgerMuted mt-1">Calm, precise expense tracking</p>
        </div>

        {renderFormContent()}
      </div>
    </div>
  );
};
