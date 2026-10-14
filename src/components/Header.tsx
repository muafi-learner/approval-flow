import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Activity,
  CheckSquare,
  PenTool,
  LogOut,
  ChevronDown,
  Check,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { SignatureModal } from './SignatureModal';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    setCurrentUser,
    users,
    requests,
    logout,
    resetDemoData,
    showToast
  } = useApp();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isResettingDummy, setIsResettingDummy] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate pending incoming requests for current user
  const incomingCount = requests.filter(r => {
    if (r.status !== 'in_progress') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  }).length;

  // Sesuai Permintaan: Rubrik di header HANYA 3 (Persetujuan, Ajukan Surat, Surat Saya)
  const navItems = [
    { id: 'approval', label: 'Persetujuan', icon: CheckSquare, badge: incomingCount },
    { id: 'pengajuan', label: 'Ajukan Surat', icon: FileText },
    { id: 'tracking', label: 'Surat Saya', icon: Activity },
  ];

  const handleDummySystemReset = () => {
    setIsResettingDummy(true);
    setTimeout(() => {
      resetDemoData();
      setIsResettingDummy(false);
      showToast('Sistem berhasil di-reset ke kondisi awal (simulasi dummy).', 'success');
      setShowProfileDropdown(false);
    }, 600);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo di Pojok Kiri Atas - Tetap Dipertahankan Sesuai Permintaan */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
                AMS
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-950 tracking-tight leading-none">
                  Approval
                </span>
                <span className="text-[11px] text-neutral-500 font-medium leading-tight mt-0.5 hidden sm:block">
                  Dokumen & Otorisasi
                </span>
              </div>
            </div>

            {/* Rubrik Navigasi Utama - CUMA ADA 3 (Persetujuan, Ajukan Surat, Surat Saya) */}
            <nav className="flex items-center p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/60">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-neutral-950 shadow-xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-950 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-80" />
                    <span>{item.label}</span>

                    {item.badge && item.badge > 0 ? (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-900 text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Profil di Pojok Kanan Atas (Nama, Email, TTD yang dipakai sekarang, Sistem Reset Dummy) */}
            <div className="relative flex items-center gap-2 shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="cursor-pointer flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl border border-neutral-200/80 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all text-left shadow-2xs"
                title="Buka menu profil"
              >
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.name[0]}
                </div>
                <div className="leading-tight hidden sm:block">
                  <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1">
                    <span>{currentUser.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate max-w-[110px]">
                    {currentUser.role}
                  </div>
                </div>
              </button>

              {/* Popover Profil di Pojok Kanan Atas */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-neutral-200/90 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150 space-y-4">
                  {/* 1. Nama Dia & Email */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {currentUser.name[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-neutral-900 truncate">
                            {currentUser.name}
                          </h4>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Aktif
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-neutral-600 truncate mt-0.5">
                          {currentUser.role}
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                          <span className="truncate">{currentUser.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. TTD yang Dia Pakai Sekarang (4:3) */}
                  <div className="bg-neutral-50/80 rounded-xl p-3 border border-neutral-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          TTD yang Sedang Dipakai
                        </span>
                        <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/80 px-1.5 py-0.2 rounded">
                          4:3
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSignatureModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200 transition-colors cursor-pointer"
                      >
                        <PenTool className="w-3 h-3 text-neutral-500" />
                        <span>Ubah TTD</span>
                      </button>
                    </div>

                    <div className="bg-white rounded-lg border border-neutral-200/80 p-2.5 flex items-center justify-center">
                      {currentUser.signatureBase64 ? (
                        <div className="flex flex-col items-center">
                          <div className="w-28 aspect-[4/3] rounded border border-neutral-100 bg-neutral-50/40 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                            <img
                              src={currentUser.signatureBase64}
                              alt="Tanda Tangan Aktif (4:3)"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-1 font-medium">Ukuran Rasio 4:3</span>
                        </div>
                      ) : (
                        <div className="text-center py-1">
                          <p className="text-[11px] text-neutral-400">Belum ada tanda tangan</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowSignatureModal(true);
                              setShowProfileDropdown(false);
                            }}
                            className="text-[11px] font-semibold text-neutral-900 underline mt-0.5 cursor-pointer"
                          >
                            Buat TTD Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Sistem Reset Dummy */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleDummySystemReset}
                      disabled={isResettingDummy}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 active:scale-98 rounded-xl transition-all cursor-pointer border border-neutral-200/60 disabled:opacity-50"
                      title="Reset simulasi sistem ke kondisi default"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-neutral-600 ${
                          isResettingDummy ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {isResettingDummy ? 'Mereset Sistem...' : 'Sistem Reset (Dummy)'}
                      </span>
                    </button>
                  </div>

                  {/* 4. Ganti Cepat Pengguna (Simulasi Approval) */}
                  <div className="pt-2 border-t border-neutral-100">
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 px-1">
                      Ganti Pengguna Simulasi
                    </div>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto pr-1">
                      {users.map(u => {
                        const isCurrent = u.id === currentUser.id;
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setCurrentUser(u);
                              setShowProfileDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-neutral-100 text-neutral-950 font-semibold'
                                : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-medium text-xs truncate">{u.name}</div>
                              <div className="text-[10px] text-neutral-400 truncate">{u.role}</div>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Tombol Keluar */}
                  <div className="pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar Akun</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modal Cepat Ubah TTD */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
      />
    </>
  );
};
