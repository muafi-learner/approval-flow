import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await login(username, password, rememberMe);
      if (!res.success) {
        setError(res.message || 'Gagal login. Periksa kembali data Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-100">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-neutral-900 flex items-center justify-center shadow-lg transition-all">
            <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-4 md:mt-6 text-center text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 transition-all">
          Approval Management
        </h2>
        <p className="mt-1.5 md:mt-2 text-center text-xs md:text-sm text-neutral-500 font-medium">
          Sistem otorisasi dokumen internal Kintoun
        </p>
      </div>

      <div className="mt-6 md:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-5 md:py-8 md:px-10 shadow-xl shadow-neutral-200/50 rounded-2xl md:rounded-[32px] border border-neutral-100 transition-all">
          <form className="space-y-5 md:space-y-6" onSubmit={handleSubmit}>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-neutral-900 mb-1.5 md:mb-2">Nama Pengguna</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 md:py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-sm font-medium text-neutral-900"
                placeholder="Budi"
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-bold text-neutral-900 mb-1.5 md:mb-2">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-12 py-2.5 md:py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-sm font-medium tracking-wide text-neutral-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-1 rounded-md"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 md:w-5 md:h-5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none w-4 h-4 md:w-5 md:h-5 border-2 border-neutral-300 rounded md:rounded-md hover:border-neutral-400 checked:bg-neutral-900 checked:border-neutral-900 transition-colors cursor-pointer"
                  />
                  <svg className="absolute w-2.5 h-2.5 md:w-3 md:h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs md:text-sm font-semibold text-neutral-600 group-hover:text-neutral-900 transition-colors">Ingat Saya</span>
              </label>
            </div>
            
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs md:text-sm text-rose-600 text-center font-bold animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                {error}
              </div>
            )}
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 md:py-3.5 px-4 border border-transparent rounded-xl shadow-md text-xs md:text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                ) : 'Masuk Aplikasi'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
};