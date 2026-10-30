import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Upload, Plus, Trash2, ArrowRight, FileText, AlertCircle, Check } from 'lucide-react';
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
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files?.[0]) processSingleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (!requestCategory) return showToast('Harap pilih Kategori Dokumen terlebih dahulu.', 'error');
    if (!approvalName.trim()) return showToast('Judul dokumen wajib diisi.', 'error');
    if (!selectedFile || !selectedFile.dataUrl) return showToast('Harap unggah file dokumen PDF terlebih dahulu.', 'error');
    if (selectedPages.length === 0) return showToast('Harap pilih minimal satu halaman untuk dibubuhkan tanda tangan.', 'error');
    
    if (approverFlow.length === 0) {
      return showToast('Alur persetujuan kosong. Harap tentukan minimal satu penanda tangan.', 'error');
    }
    
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
        selectedFile.name,
        selectedFile.dataUrl,
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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Buat Pengajuan Baru</h1>
        <p className="text-sm text-neutral-500">Unggah dokumen dan lengkapi detail persetujuan di bawah ini.</p>
      </div>
      
      <form onSubmit={handleInitialSubmit} className="space-y-10">
        
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-900">1. Dokumen Utama</h2>
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          
          {selectedFile ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-neutral-200 bg-white rounded-xl gap-4 shadow-sm transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-neutral-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-neutral-500">{selectedFile.size} · {detectedPageCount} Halaman</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-md transition-colors">
                  Ganti File
                </button>
                <button type="button" onClick={() => { setSelectedFile(null); setApproverFlow([]); setSelectedPages([]); setApprovalName(''); setForceNewPage(false); }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
               onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}
               className="border border-dashed border-neutral-300 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 hover:border-neutral-400 transition-colors"
            >
              <Upload className="w-6 h-6 text-neutral-400 mb-3" />
              <span className="text-sm font-semibold text-neutral-900">Pilih file PDF dokumen utama</span>
              <span className="text-xs text-neutral-500 mt-1">atau seret file ke area ini</span>
            </div>
          )}
        </section>

        {selectedFile && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-sm font-bold text-neutral-900 mb-5">2. Detail Pengajuan</h2>
            
            <div className="space-y-6 bg-white p-6 rounded-xl border border-neutral-100 shadow-sm">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Kategori Dokumen</label>
                <select
                  value={requestCategory}
                  onChange={e => { setRequestCategory(e.target.value as 'Design' | 'WO Existing'); setForceNewPage(false); }}
                  className="w-full px-4 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 cursor-pointer transition-colors"
                >
                  <option value="" disabled>Pilih Kategori Dokumen</option>
                  <option value="Design">Design Drawing</option>
                  <option value="WO Existing">In General</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Judul Dokumen</label>
                <input
                  type="text" required value={approvalName} onChange={e => setApprovalName(e.target.value)}
                  placeholder="Ketik judul dokumen..."
                  className="w-full px-4 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Pilih Halaman Untuk Distempel</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Array.from({ length: detectedPageCount }, (_, i) => i + 1).map(pageNum => (
                    <label key={pageNum} className={`flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer transition-colors ${selectedPages.includes(pageNum) ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-transparent text-neutral-600 border-neutral-200 hover:border-neutral-300'}`}>
                      <input type="checkbox" className="hidden" checked={selectedPages.includes(pageNum)} onChange={() => togglePageSelection(pageNum)} />
                      <span className="text-xs font-medium">Halaman {pageNum}</span>
                    </label>
                  ))}
                </div>

                {requestCategory === 'WO Existing' && (
                  <div className="pt-4 border-t border-neutral-100">
                    <label className="flex flex-row items-start gap-3 cursor-pointer p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                      <div className="flex items-center h-5 mt-0.5">
                        <input type="checkbox" checked={forceNewPage} onChange={e => setForceNewPage(e.target.checked)} className="w-4 h-4 accent-neutral-900 border-neutral-300 rounded cursor-pointer" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-neutral-900">Paksa Halaman Baru (Khusus In General)</span>
                        <span className="text-[10px] text-neutral-500 mt-0.5">Centang ini jika baris terakhir PDF sudah penuh. Sistem akan otomatis menambahkan satu halaman kosong di bagian paling belakang dokumen khusus untuk menampung seluruh stempel.</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {selectedFile && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300 delay-100">
            <h2 className="text-sm font-bold text-neutral-900 mb-5">3. Alur Otorisasi</h2>
            
            <div className="bg-white p-6 rounded-xl border border-neutral-100 shadow-sm">
              {requestCategory === '' ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-neutral-500">Pilih Kategori Dokumen di atas untuk memuat alur.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approverFlow.length === 0 ? (
                    <div className="py-4 text-sm text-neutral-500">Belum ada penanda tangan yang ditambahkan.</div>
                  ) : (
                    <div className="space-y-3">
                      {approverFlow.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                          <span className="text-xs font-bold text-neutral-400 w-4">{idx + 1}.</span>
                          <select
                            value={step.userId} onChange={e => handleUpdateApproverUser(step.id, e.target.value)}
                            className="flex-1 px-3 py-2 text-sm bg-transparent border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 cursor-pointer transition-colors"
                          >
                            {/* Tambahkan pengecekan array users sebelum map */}
                            {users && users.length > 0 ? users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                            )) : <option value="">Memuat data...</option>}
                          </select>
                          <button type="button" onClick={() => setApproverFlow(prev => prev.filter(item => item.id !== step.id))} className="p-2 text-neutral-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button type="button" onClick={() => {
                    // PERBAIKAN: Berikan fallback yang sangat aman jika users kosong
                    if (!users || users.length === 0) {
                      showToast('Menunggu data pengguna dimuat dari server...', 'info');
                      return;
                    }
                    const availableUsers = users.filter(u => u.id !== currentUser.id && !approverFlow.some(a => a.userId === u.id));
                    const u = availableUsers.length > 0 ? availableUsers[0] : users[0];
                    setApproverFlow(prev => [...prev, { id: Date.now().toString(), name: u.name, role: u.role, userId: u.id }]);
                  }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-colors py-2 rounded-md">
                    <Plus className="w-3.5 h-3.5" /> Tambah Approver
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {selectedFile && (
          <div className="pt-6 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Form akan diajukan oleh <strong className="text-neutral-900">{currentUser.name}</strong></p>
            <button type="submit" disabled={isSubmitting || requestCategory === ''} className="px-8 py-3 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md hover:shadow-lg">
              {isSubmitting ? 'Memproses...' : 'Kirim Pengajuan'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-neutral-700" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Kirim Dokumen?</h3>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed mb-6">
              Dokumen <strong>{approvalName || 'tanpa judul'}</strong> akan disirkulasikan ke <strong>{approverFlow.length} approver</strong>. Pastikan urutan dan pengaturan halamannya sudah sesuai.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={executeFinalSubmit} className="w-full py-3 text-sm font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors text-center shadow-sm">
                Ya, Kirim Sekarang
              </button>
              <button type="button" onClick={() => setShowConfirmModal(false)} className="w-full py-3 text-sm font-semibold text-neutral-700 bg-transparent rounded-xl hover:bg-neutral-50 transition-colors text-center">
                Periksa Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};