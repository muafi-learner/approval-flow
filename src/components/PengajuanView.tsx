import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, Plus, Trash2, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { analyzePdfApproverLayout } from '../services/pdfTextExtractor';
import { DetectedSlot } from '../types';

interface ApproverInput {
  id: string;
  name: string;
  role: string;
  userId: string;
  isMatchedFromPdf?: boolean;
  detectedSlot?: DetectedSlot;
  detectedSlots?: DetectedSlot[];
}

export const PengajuanView: React.FC = () => {
  const { users, currentUser, createNewRequest, setActiveTab, showToast } = useApp();
  
  const [requestCategory, setRequestCategory] = useState<'Design' | 'WO Existing' | ''>('');
  const [approvalName, setApprovalName] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; dataUrl: string; size: string; buffer?: ArrayBuffer } | null>(null);
  
  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [detectedPageCount, setDetectedPageCount] = useState<number>(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [forceNewPage, setForceNewPage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pdfDetectedSlots, setPdfDetectedSlots] = useState<any[]>([]);
  const [approverFlow, setApproverFlow] = useState<ApproverInput[]>([]);

  const processAndScanPdfBuffer = async (buffer: ArrayBuffer, fileName: string, dataUrl: string) => {
    setIsScanningPdf(true);
    try {
      const analysis = await analyzePdfApproverLayout(buffer, users);
      if (analysis.pageCount) {
        setDetectedPageCount(analysis.pageCount);
        setSelectedPages(Array.from({ length: analysis.pageCount }, (_, i) => i + 1));
      }
      if (analysis.multiPageFlow && analysis.multiPageFlow.length > 0) {
        setPdfDetectedSlots(analysis.multiPageFlow);
      } else {
        setPdfDetectedSlots([]);
      }
      showToast('File dokumen berhasil dilampirkan.', 'info');
    } catch (err) {
      console.warn('PDF scan issue:', err);
    } finally {
      setIsScanningPdf(false);
    }
  };

  const processSingleFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return showToast('Gunakan file berformat PDF.', 'error');
    }
    setApprovalName(prev => prev.trim() ? prev : file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
    
    const dataUrlReader = new FileReader();
    dataUrlReader.onload = () => {
      const base64DataUrl = dataUrlReader.result as string;
      const bufferReader = new FileReader();
      bufferReader.onload = async () => {
        const buffer = bufferReader.result as ArrayBuffer;
        setSelectedFile({ name: file.name, dataUrl: base64DataUrl, size: `${(file.size / 1024).toFixed(1)} KB`, buffer });
        await processAndScanPdfBuffer(buffer, file.name, base64DataUrl);
      };
      bufferReader.readAsArrayBuffer(file);
    };
    dataUrlReader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processSingleFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files?.[0]) processSingleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };

  const handleUpdateApproverUser = (id: string, userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setApproverFlow(prev => prev.map(item => item.id === id ? { ...item, userId: u.id, name: u.name, role: u.role } : item));
  };

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages(prev => prev.includes(pageNum) ? prev.filter(p => p !== pageNum) : [...prev, pageNum]);
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestCategory) return showToast('Harap pilih Kategori Dokumen.', 'error');
    if (!approvalName.trim()) return showToast('Judul dokumen wajib diisi.', 'error');
    if (!selectedFile) return showToast('Harap unggah file dokumen PDF.', 'error');
    if (selectedPages.length === 0) return showToast('Pilih minimal satu halaman untuk stempel.', 'error');
    if (approverFlow.length === 0) return showToast('Alur persetujuan kosong.', 'error');
    
    setShowConfirmModal(true);
  };

  const executeFinalSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const formattedApprovers = approverFlow.map(a => {
        const matchedSlot = pdfDetectedSlots.find(
          (slot: any) => slot.userId === a.userId || 
                         slot.userName.toLowerCase() === a.name.toLowerCase() || 
                         slot.roleTitle.toLowerCase() === a.role.toLowerCase()
        );
        return {
          userId: a.userId,
          userName: a.name,
          roleTitle: a.role,
          detectedSlot: matchedSlot?.detectedSlot,
          detectedSlots: matchedSlot?.detectedSlots,
        };
      });

      await createNewRequest(
        approvalName.trim(),
        selectedFile!.name,
        selectedFile!.dataUrl,
        formattedApprovers,
        detectedPageCount,
        requestCategory,
        selectedPages,
        forceNewPage
      );
      
      setActiveTab('tracking');
    } catch (err: any) {
      showToast(err?.message || 'Pengajuan gagal dikirim.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 md:px-6">
      
      {/* HEADER DIRAMPINGKAN UNTUK MOBILE */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">Buat Pengajuan Baru</h1>
        <p className="text-xs md:text-sm text-neutral-500 mt-1">Unggah dokumen dan lengkapi detail persetujuan.</p>
      </div>
      
      <form onSubmit={handleInitialSubmit} className="space-y-8">
        
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs md:text-sm font-bold text-neutral-900 uppercase tracking-wide">1. Dokumen Utama</h2>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          
          {selectedFile ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 border border-neutral-200 bg-white rounded-xl gap-3 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-semibold text-neutral-900 truncate">{selectedFile.name}</p>
                  <p className="text-[10px] md:text-xs text-neutral-500 font-medium">{selectedFile.size} · {detectedPageCount} Halaman</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-[11px] md:text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                  Ganti File
                </button>
                <button type="button" onClick={() => { setSelectedFile(null); setApproverFlow([]); setSelectedPages([]); setApprovalName(''); setForceNewPage(false); }} className="p-1.5 text-neutral-400 hover:text-rose-600 bg-neutral-50 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div 
               onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-neutral-200 rounded-xl p-8 md:p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 hover:border-neutral-300 transition-all group"
            >
              <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5 text-neutral-400" />
              </div>
              <span className="text-sm md:text-base font-bold text-neutral-800">Pilih file PDF dokumen</span>
              <span className="text-xs text-neutral-500 mt-1">atau seret file ke area ini</span>
            </div>
          )}
        </section>

        {selectedFile && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xs md:text-sm font-bold text-neutral-900 uppercase tracking-wide mb-3">2. Detail Pengajuan</h2>
            
            <div className="space-y-5 bg-white p-4 md:p-6 rounded-xl border border-neutral-100 shadow-sm">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Kategori Dokumen</label>
                <select
                  value={requestCategory}
                  onChange={e => { setRequestCategory(e.target.value as 'Design' | 'WO Existing'); setForceNewPage(false); }}
                  className="w-full px-3 py-2.5 text-xs md:text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 cursor-pointer transition-colors"
                >
                  <option value="" disabled>Pilih Kategori Dokumen...</option>
                  <option value="Design">Design Drawing</option>
                  <option value="WO Existing">In General</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Judul Dokumen</label>
                <input
                  type="text" required value={approvalName} onChange={e => setApprovalName(e.target.value)}
                  placeholder="Ketik judul dokumen..."
                  className="w-full px-3 py-2.5 text-xs md:text-sm bg-transparent border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Posisi Stempel (Pilih Halaman)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.from({ length: detectedPageCount }, (_, i) => i + 1).map(pageNum => (
                    <label key={pageNum} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg cursor-pointer transition-colors ${selectedPages.includes(pageNum) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-transparent text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                      <input type="checkbox" className="hidden" checked={selectedPages.includes(pageNum)} onChange={() => togglePageSelection(pageNum)} />
                      <span className="text-[11px] md:text-xs font-semibold">Halaman {pageNum}</span>
                    </label>
                  ))}
                </div>

                {requestCategory === 'WO Existing' && (
                  <div className="pt-3 border-t border-neutral-100">
                    <label className="flex flex-row items-start gap-2.5 cursor-pointer p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg hover:bg-amber-50 transition-colors">
                      <div className="flex items-center h-4 mt-0.5">
                        <input type="checkbox" checked={forceNewPage} onChange={e => setForceNewPage(e.target.checked)} className="w-3.5 h-3.5 accent-neutral-900 border-neutral-300 rounded cursor-pointer" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-neutral-800">Paksa Halaman Baru (Khusus In General)</span>
                        <span className="text-[9px] text-neutral-500 mt-0.5 leading-relaxed">Centang ini jika baris terakhir PDF sudah penuh. Sistem akan menambahkan satu halaman kosong di belakang khusus untuk menampung stempel.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {selectedFile && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
            <h2 className="text-xs md:text-sm font-bold text-neutral-900 uppercase tracking-wide mb-3">3. Alur Otorisasi</h2>
            
            <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-100 shadow-sm">
              {requestCategory === '' ? (
                <div className="py-6 text-center bg-neutral-50 rounded-lg border border-neutral-100 border-dashed">
                  <p className="text-xs text-neutral-500">Pilih Kategori Dokumen di atas untuk memuat alur.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approverFlow.length === 0 ? (
                    <div className="py-4 text-xs text-neutral-400 text-center border border-neutral-100 border-dashed rounded-lg bg-neutral-50">
                      Belum ada penanda tangan yang ditambahkan.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {approverFlow.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-left-2">
                          <span className="text-[10px] md:text-xs font-bold text-neutral-400 w-3 md:w-4">{idx + 1}.</span>
                          <select
                            value={step.userId} onChange={e => handleUpdateApproverUser(step.id, e.target.value)}
                            className="flex-1 px-3 py-2 text-xs md:text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 cursor-pointer transition-colors"
                          >
                            {users && users.length > 0 ? users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                            )) : <option value="">Memuat data...</option>}
                          </select>
                          <button type="button" onClick={() => setApproverFlow(prev => prev.filter(item => item.id !== step.id))} className="p-2 text-neutral-400 hover:text-rose-600 bg-neutral-50 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button type="button" onClick={() => {
                    if (!users || users.length === 0) {
                      showToast('Menunggu data pengguna dimuat...', 'info'); return;
                    }
                    const availableUsers = users.filter(u => u.id !== currentUser.id && !approverFlow.some(a => a.userId === u.id));
                    const u = availableUsers.length > 0 ? availableUsers[0] : users[0];
                    setApproverFlow(prev => [...prev, { id: Date.now().toString(), name: u.name, role: u.role, userId: u.id }]);
                  }} className="inline-flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg transition-colors mt-2">
                    <Plus className="w-3.5 h-3.5" /> Tambah Approver
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {selectedFile && (
          <div className="pt-4 border-t border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky bottom-0 bg-neutral-100 pb-4 md:pb-0 md:bg-transparent md:static z-10">
            <p className="text-[10px] md:text-xs text-neutral-500 text-center md:text-left">
              Form akan diajukan oleh <strong className="text-neutral-900">{currentUser.name}</strong>
            </p>
            <button type="submit" disabled={isSubmitting || requestCategory === ''} className="w-full md:w-auto px-8 py-3 text-xs md:text-sm font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md">
              {isSubmitting ? 'Memproses...' : 'Kirim Pengajuan'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Kirim Dokumen?</h3>
            </div>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mb-6">
              Dokumen <strong className="text-neutral-900">{approvalName || 'tanpa judul'}</strong> akan disirkulasikan ke <strong className="text-neutral-900">{approverFlow.length} approver</strong>. Pastikan urutan dan pengaturan halaman sudah sesuai.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={executeFinalSubmit} className="w-full py-3 text-xs font-bold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm">
                Ya, Kirim Sekarang
              </button>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="w-full py-3 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
                Periksa Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};