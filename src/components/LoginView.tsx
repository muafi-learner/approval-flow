import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);
    const result = login(username, password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.message || 'Kredensial tidak valid.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm mb-4">
            AMS
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Persetujuan Dokumen</h1>
          <p className="text-sm text-neutral-500 mt-1 text-center">Masuk untuk mengelola dokumen</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 rounded-lg flex items-start gap-2 text-sm text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Username</label>
              <input
                type="text"
                autoFocus
                required
                value={username}
                onChange={e => { setUsername(e.target.value); setError(null); }}
                placeholder="Masukkan username..."
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="Masukkan password..."
                className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Memproses...' : 'Masuk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};