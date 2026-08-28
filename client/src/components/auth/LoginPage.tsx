import { useState } from 'react';
import { Shield, UserPlus, Lock, Envelope, ArrowRight } from '@phosphor-icons/react';
import { signIn, signUp } from '../../services/auth';
import type { ToastMessage } from '../ui/Toast';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; email: string }) => void;
  showToast: (toast: ToastMessage) => void;
}

export function LoginPage({ onLoginSuccess, showToast }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        showToast({
          id: Date.now().toString(),
          type: 'success',
          text: 'Account created! You can now sign in.',
        });
        setIsSignUp(false);
      } else {
        const user = await signIn(email, password);
        onLoginSuccess({
          id: user.id,
          email: user.email!,
        });
      }
    } catch (error: any) {
      // If sign-in fails due to invalid credentials or user not found, switch to signup
      const errorMessage = error.message || 'Authentication failed';
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('not found') || errorMessage.includes('Invalid login')) {
        showToast({
          id: Date.now().toString(),
          type: 'info',
          text: 'Account not found. Please create an account first.',
        });
        setIsSignUp(true);
      } else {
        showToast({
          id: Date.now().toString(),
          type: 'error',
          text: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-base p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Shield className="w-8 h-8 text-accent" weight="fill" />
          <span className="text-lg font-display font-bold text-text-primary tracking-wide">
            CYBER TRACE AI
          </span>
        </div>

        {/* Form Card */}
        <div className="bg-panel border border-border-default rounded-lg p-6">
          <h1 className="text-base font-display font-bold text-text-primary mb-2">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </h1>
          <p className="text-xs text-text-muted mb-6">
            {isSignUp 
              ? 'Enter your details to create an investigation account'
              : 'Access your criminal network analysis dashboard'
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-semibold text-text-primary mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-panel-alt border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-text-primary mb-1.5">
                Email
              </label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-panel-alt border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="investigator@agency.gov"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-primary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-panel-alt border border-border-default rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded bg-accent text-[#05080d] text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#05080d] border-t-transparent rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Sign In/Sign Up */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] text-accent hover:text-accent/80 transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Create one'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}