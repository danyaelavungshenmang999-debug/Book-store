import { useEffect, useRef, useState } from 'react';
import { X, Mail, KeyRound, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { apiRequest, setStoredToken } from '../lib/api';
import { User } from '../types';

type AuthStep = 'login' | 'register' | 'verify-otp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}

export function AuthModal({ isOpen, onClose, onAuthenticated }: AuthModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<AuthStep>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (step !== 'verify-otp' || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, secondsLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      const eObj = err as Error & { data?: { needsVerification?: boolean; email?: string } };
      if (eObj.data?.needsVerification) {
        setStep('verify-otp');
        setSecondsLeft(300);
        setInfo(t.auth.unverifiedInfo);
      } else {
        setError(eObj.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await apiRequest<{
        message: string;
        email: string;
        cooldownSeconds?: number;
        expiresInSeconds?: number;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setEmail(res.email);
      setOtpDigits(['', '', '', '', '', '']);
      setSecondsLeft(res.expiresInSeconds || 300);
      setResendCooldown(res.cooldownSeconds || 60);
      setInfo(res.message);
      setStep('verify-otp');
    } catch (err) {
      const eObj = err as Error & { data?: { retryAfterSeconds?: number } };
      if (eObj.data?.retryAfterSeconds) {
        setResendCooldown(eObj.data.retryAfterSeconds);
      }
      setError(eObj.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setOtpDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError(t.auth.otpLengthError);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp: code }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    resetMessages();
    setLoading(true);
    try {
      const res = await apiRequest<{
        message: string;
        cooldownSeconds?: number;
        expiresInSeconds?: number;
      }>('/api/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSecondsLeft(res.expiresInSeconds || 300);
      setResendCooldown(res.cooldownSeconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setInfo(res.message);
    } catch (err) {
      const eObj = err as Error & { data?: { retryAfterSeconds?: number } };
      if (eObj.data?.retryAfterSeconds) {
        setResendCooldown(eObj.data.retryAfterSeconds);
      }
      setError(eObj.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'customer' | 'admin') => {
    resetMessages();
    setStep('login');
    if (role === 'customer') {
      setEmail('aye@bookhaven.mm');
      setPassword('Customer123!');
    } else {
      setEmail('admin@bookhaven.mm');
      setPassword('Admin123!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-[#FAF9F6] border border-[#DED8CC] rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D8]">
          <h2 id="auth-modal-title" className="font-display text-xl font-semibold text-[#18181B]">
            {step === 'login' && t.auth.loginTitle}
            {step === 'register' && t.auth.registerTitle}
            {step === 'verify-otp' && t.auth.otpTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.auth.closeAria}
            className="p-1.5 text-[#52525B] hover:text-[#18181B] rounded-lg hover:bg-[#EFECE5] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step !== 'verify-otp' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#EFECE5] rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setStep('login');
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  step === 'login'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {t.auth.signInTab}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setStep('register');
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                  step === 'register'
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {t.auth.registerTab}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2.5 p-3 text-sm text-[#991B1B] bg-[#FEE2E2]/70 border border-[#FECACA] rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="mb-4 flex items-start gap-2.5 p-3 text-sm text-[#0F5132] bg-[#DCFCE7]/60 border border-[#BBF7D0] rounded-lg">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#18181B] mb-1.5">
                  {t.auth.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholderLogin}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#18181B] mb-1.5">
                  {t.auth.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholderLogin}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? t.auth.signingIn : t.auth.signInBtn}
              </button>

              <div className="pt-4 border-t border-[#E5E0D8]">
                <p className="text-xs text-[#71717A] mb-2.5">{t.auth.demoPrompt}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => fillDemo('customer')}
                    className="px-3 py-2 text-xs font-medium text-[#18181B] bg-[#F3F1EC] hover:bg-[#E7E3D8] border border-[#DED8CC] rounded-lg transition-colors cursor-pointer"
                  >
                    {t.auth.fillCustomer}
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('admin')}
                    className="px-3 py-2 text-xs font-medium text-[#18181B] bg-[#F3F1EC] hover:bg-[#E7E3D8] border border-[#DED8CC] rounded-lg transition-colors cursor-pointer"
                  >
                    {t.auth.fillAdmin}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#18181B] mb-1.5">
                  {t.auth.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.auth.fullNamePlaceholder}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#18181B] mb-1.5">
                  {t.auth.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholderReg}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#18181B] mb-1.5">
                  {t.auth.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholderReg}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? t.auth.sendingOtp : t.auth.registerBtn}
              </button>
            </form>
          )}

          {step === 'verify-otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex items-start gap-3 text-sm text-[#52525B]">
                <Mail className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
                <p>
                  {t.auth.otpPromptStart}{' '}
                  <strong className="text-[#18181B]">{email}</strong>. {t.auth.otpPromptMid}{' '}
                  <span className="font-mono tabular-nums font-semibold text-[#18181B]">
                    {formatTimer(secondsLeft)}
                  </span>
                  .
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2" aria-label={t.auth.otpAria}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-full h-12 text-center font-mono text-lg font-semibold bg-white border border-[#D4D0C7] rounded-lg focus:outline-none focus:border-[#0F5132] tabular-nums"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || secondsLeft === 0}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? t.auth.verifying : t.auth.verifyBtn}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E5E0D8]">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setStep('register');
                  }}
                  className="text-[#52525B] hover:text-[#18181B] cursor-pointer"
                >
                  {t.auth.changeEmail}
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || resendCooldown > 0}
                  className="inline-flex items-center gap-1.5 font-medium text-[#0F5132] hover:underline disabled:text-[#71717A] disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0
                      ? t.auth.resendIn(resendCooldown)
                      : t.auth.resendOtp}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
