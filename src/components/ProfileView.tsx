import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, PenTool, ShieldCheck, Mail } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, setActiveTab } = useApp();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Profil Pengguna
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Kelola informasi identitas dan otorisasi digital Anda.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 shadow-sm">
        {/* Identitas Card */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-neutral-100">
          <div className="w-20 h-20 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-3xl shadow-sm shrink-0">
            {currentUser.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-neutral-900">
                {currentUser.name}
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Aktif
              </span>
            </div>
            <div className="text-sm font-medium text-neutral-900">
              {currentUser.role}
            </div>
            <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1.5">
              <Mail className="w-3.5 h-3.5" />
              {currentUser.email}
            </div>
          </div>
        </div>

        {/* Tanda Tangan Section */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Tanda Tangan Digital Resmi
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ini adalah coretan yang akan distempel otomatis pada dokumen PDF.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('ttd')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition-colors shadow-sm"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Perbarui TTD</span>
            </button>
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center">
            {currentUser.signatureBase64 ? (
              <>
                <div className="w-56 aspect-[4/3] rounded-lg border border-neutral-200 bg-white p-2 flex items-center justify-center overflow-hidden shadow-sm">
                  <img
                    src={currentUser.signatureBase64}
                    alt="Tanda Tangan"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tanda Tangan Valid (4:3)
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-500 mb-4">
                  Anda belum mengunggah atau menggambar tanda tangan.
                </p>
                <button
                  onClick={() => setActiveTab('ttd')}
                  className="px-5 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
                >
                  Atur Tanda Tangan Sekarang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};