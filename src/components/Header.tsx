import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Activity,
  CheckSquare,
  PenTool,
  LogOut,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { SignatureModal } from './SignatureModal';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    requests,
    logout
  } = useApp();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const incomingCount = requests.filter(r => {
    if (r.status !== 'in_progress') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  }).length;

  const navItems = [
    { id: 'approval', label: 'Persetujuan', icon: CheckSquare, badge: incomingCount },
    { id: 'pengajuan', label: 'Ajukan Surat', icon: FileText },
    { id: 'tracking', label: 'Surat Saya', icon: Activity },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
                AMS
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-900 tracking-tight leading-none">
                  Approval
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 ? (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white leading-none">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            {/* Profile Dropdown */}
            <div className="relative flex items-center shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-md bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.name[0]}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-neutral-900 flex items-center gap-1">
                    {currentUser.name}
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </div>
                </div>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-neutral-100 mb-2 bg-neutral-50/50">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-sm font-bold text-neutral-900 truncate">
                        {currentUser.name}
                      </h4>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {currentUser.role}
                    </div>
                  </div>

                  <div className="px-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-700">Tanda Tangan Digital</span>
                      <button
                        onClick={() => { setShowSignatureModal(true); setShowProfileDropdown(false); }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium flex items-center gap-1 transition-colors cursor-pointer bg-neutral-100 px-2 py-0.5 rounded"
                      >
                        <PenTool className="w-3 h-3" /> Ubah
                      </button>
                    </div>
                    {currentUser.signatureBase64 ? (
                      <div className="w-full h-16 rounded border border-neutral-200 bg-neutral-50 flex items-center justify-center p-2">
                        <img src={currentUser.signatureBase64} alt="TTD" className="h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-full h-16 rounded border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-xs text-neutral-400">
                        Belum diatur
                      </div>
                    )}
                  </div>

                  <div className="px-2 border-t border-neutral-100 pt-2 mt-2">
                    <button
                      onClick={() => { setShowProfileDropdown(false); logout(); }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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

        {/* Mobile Navigation Navigation */}
        <div className="sm:hidden border-t border-neutral-200 overflow-x-auto hide-scrollbar">
          <nav className="flex items-center px-2 py-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex-1 flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isActive ? 'text-neutral-900 border-b-2 border-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="px-1.5 rounded-full text-[9px] font-bold bg-neutral-900 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} />
    </>
  );
};