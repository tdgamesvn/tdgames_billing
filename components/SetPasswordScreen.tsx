import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';

interface SetPasswordScreenProps {
  onComplete: () => void;
}

export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });
      if (updateError) throw updateError;
      onComplete();
    } catch (e: any) {
      setError(e.message || 'Đặt mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#0F0F0F' }}
    >
      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-[120px] opacity-20"
          style={{
            width: '700px', height: '700px',
            background: 'radial-gradient(circle, #34C759 0%, transparent 70%)',
            top: '-250px', left: '-200px',
          }}
        />
        <div
          className="absolute rounded-full blur-[100px] opacity-10"
          style={{
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)',
            bottom: '-150px', right: '-150px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(#34C759 1px, transparent 1px), linear-gradient(90deg, #34C759 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
        <div
          className="rounded-[28px] border p-10"
          style={{
            background: 'rgba(26,26,26,0.85)',
            backdropFilter: 'blur(32px)',
            borderColor: 'rgba(52,199,89,0.18)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Branding */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: 'rgba(52,199,89,0.1)',
                border: '1.5px solid rgba(52,199,89,0.35)',
                boxShadow: '0 0 40px rgba(52,199,89,0.2)',
              }}
            >
              <span style={{ fontSize: '32px' }}>🔐</span>
            </div>
            <h1
              className="text-2xl font-black uppercase tracking-[0.08em] font-montserrat"
              style={{ color: '#34C759' }}
            >
              Chào mừng!
            </h1>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.15em] mt-2 text-center"
              style={{ color: 'rgba(157,156,157,0.7)' }}
            >
              Đặt mật khẩu mới để bắt đầu sử dụng
            </p>
          </div>

          {/* Divider */}
          <div
            className="w-full h-px mb-8"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(52,199,89,0.25), transparent)' }}
          />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div>
              <label
                className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2 font-montserrat"
                style={{ color: '#9D9C9D' }}
              >
                Mật khẩu mới
              </label>
              <div className="relative">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(52,199,89,0.5)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full rounded-xl pl-11 pr-12 py-3.5 text-sm font-medium font-montserrat outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(52,199,89,0.15)',
                    color: '#F2F2F2',
                    caretColor: '#34C759',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(52,199,89,0.55)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(52,199,89,0.07)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(52,199,89,0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100"
                  style={{ color: '#9D9C9D' }}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                className="block text-[10px] font-black uppercase tracking-[0.15em] mb-2 font-montserrat"
                style={{ color: '#9D9C9D' }}
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(52,199,89,0.5)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium font-montserrat outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1.5px solid rgba(52,199,89,0.15)',
                    color: '#F2F2F2',
                    caretColor: '#34C759',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(52,199,89,0.55)';
                    e.target.style.boxShadow = '0 0 0 4px rgba(52,199,89,0.07)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(52,199,89,0.15)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 font-montserrat"
                style={{
                  background: 'rgba(244,67,54,0.1)',
                  border: '1px solid rgba(244,67,54,0.3)',
                  color: '#F44336',
                  animation: 'fadeInUp 0.2s ease-out',
                }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-4 text-sm font-black uppercase tracking-[0.12em] font-montserrat transition-all"
              style={{
                background: isLoading
                  ? 'rgba(52,199,89,0.5)'
                  : 'linear-gradient(135deg, #34C759 0%, #059669 100%)',
                color: '#0F0F0F',
                boxShadow: isLoading ? 'none' : '0 8px 24px rgba(52,199,89,0.4)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                '✅ Đặt mật khẩu & Đăng nhập'
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-[9px] font-bold uppercase tracking-[0.2em] mt-8 font-montserrat"
            style={{ color: 'rgba(157,156,157,0.35)' }}
          >
            TD Games Employee Portal · 2026
          </p>
        </div>
      </div>
    </div>
  );
};
