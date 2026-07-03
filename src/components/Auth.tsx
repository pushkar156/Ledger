import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Mail, Loader2, Eye, EyeOff, User } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              avatar_emoji: '📊', // Default avatar
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // Supabase sometimes requires email verification, check if user is created but session is null
        if (data.user && !data.session) {
          setError('Verification email sent! Please check your inbox.');
        } else if (data.session) {
          onAuthSuccess();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Auth Form */}
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ledgerMuted mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ledgerMuted" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
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

          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
              error.includes('Verification email')
                ? 'bg-ledgerMint/10 border-ledgerMint/20 text-ledgerMint'
                : 'bg-ledgerCoral/10 border-ledgerCoral/20 text-ledgerCoral'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ledgerMint text-[#0F1B1E] font-medium py-2.5 rounded-lg text-sm hover:bg-ledgerMint/90 active:transform active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        {/* Toggle link */}
        <div className="text-center mt-6">
          <button
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
        </div>
      </div>
    </div>
  );
};
