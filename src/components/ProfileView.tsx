import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  RefreshCw,
  LogOut,
  PenTool,
  ShieldCheck,
  RotateCw
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, users, setActiveTab, logout, showToast } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDummyRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Data profil dan tanda tangan aktif berhasil disegarkan.', 'success');
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            Profil Pengguna
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Informasi akun pejabat penandatangan dan status tanda tangan aktif.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Main Simple Profile Section (Sesuai Permintaan: Nama, Jabatan, TTD yang Sedang Dipakai, Tombol Refresh Dummy) */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 p-6 sm:p-7 shadow-xs space-y-6">
        {/* User Identity: Nama & Jabatan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
              {currentUser.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-neutral-900">
                  {currentUser.name}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Aktif
                </span>
              </div>
              <div className="text-sm font-semibold text-neutral-600 mt-0.5">
                {currentUser.role}
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                {currentUser.department} · {currentUser.email}
              </div>
            </div>
          </div>

          {/* Tombol Refresh Dummy */}
          <div>
            <button
              type="button"
              onClick={handleDummyRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Segarkan data profil"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyegarkan...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Tanda Tangan yang Sedang Dipakai */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Tanda Tangan yang Sedang Dipakai
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Tanda tangan resmi yang otomatis diterapkan saat pengesahan dokumen.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('ttd')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5 text-neutral-500" />
              <span>Ubah TTD</span>
            </button>
          </div>

          <div className="p-5 bg-neutral-50/70 rounded-xl border border-neutral-200/80 flex flex-col items-center justify-center">
            {currentUser.signatureBase64 ? (
              <div className="flex flex-col items-center">
                <div className="w-48 sm:w-56 aspect-[4/3] rounded-xl border border-neutral-200/90 bg-white p-2.5 flex items-center justify-center overflow-hidden shadow-2xs">
                  <img
                    src={currentUser.signatureBase64}
                    alt="Tanda Tangan Aktif (4:3)"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tanda Tangan Siap Digunakan</span>
                  </span>
                  <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200/70">
                    Format Ukuran 4:3
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-neutral-500 mb-2">
                  Belum ada tanda tangan digital yang tersimpan.
                </p>
                <button
                  onClick={() => setActiveTab('ttd')}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Buat Tanda Tangan Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Account Switcher Card */}
      <div className="mt-6 bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
          Ganti Akun Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {users.map(u => {
            const isSelected = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setCurrentUser(u);
                  showToast(`Beralih ke akun ${u.name} (${u.role})`, 'info');
                }}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                    : 'bg-neutral-50/70 hover:bg-white hover:border-neutral-300 border-neutral-200 text-neutral-900'
                }`}
              >
                <div className="text-xs font-bold truncate">{u.name}</div>
                <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-neutral-300 font-normal' : 'text-neutral-500 font-normal'}`}>
                  {u.role}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
