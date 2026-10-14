import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Harap masukkan username.');
      return;
    }

    if (!password.trim()) {
      setError('Harap masukkan password.');
      return;
    }

    setIsLoading(true);
    const result = login(username, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.message || 'Username atau password tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 flex flex-col justify-center items-center p-4 sm:p-6 text-neutral-900">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 text-white font-bold text-lg mb-3 shadow-xs">
            AMS
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
            Persetujuan Dokumen
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Sistem Otorisasi dan Tanda Tangan Digital Resmi
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-neutral-200/90 p-6 sm:p-7">
          <div className="mb-5 pb-3 border-b border-neutral-100">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900">
              Masuk ke Akun
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Masukkan akun Anda atau pilih profil langsung di bawah.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200/70 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Gagal Masuk:</span> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  required
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="ivan, sigit, fitrah, nada, billie"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-neutral-50/70 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Kata sandi sama dengan username"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-neutral-50/70 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white text-neutral-900 transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Memproses...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Click Persona Selector */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
              Pilih Akun Cepat (1-Klik):
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { u: 'ivan', name: 'Ivan', role: 'Managing Director' },
                { u: 'sigit', name: 'Sigit', role: 'Project Manager' },
                { u: 'fitrah', name: 'Fitrah', role: 'RND Manager' },
                { u: 'nada', name: 'Nada', role: 'Supervisor Audit' },
                { u: 'anton', name: 'Anton', role: 'CEO' },
                { u: 'billie', name: 'Billie', role: 'Staff (Pengaju)' },
              ].map(item => (
                <button
                  key={item.u}
                  type="button"
                  onClick={() => {
                    setUsername(item.u);
                    setPassword(item.u);
                    setError(null);
                    login(item.u, item.u);
                  }}
                  className="p-2.5 text-left rounded-xl border border-neutral-200/80 hover:border-neutral-900 bg-neutral-50/50 hover:bg-white transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-neutral-900 group-hover:text-black">{item.name}</div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">{item.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
