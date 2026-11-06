import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest, ApproverStep } from '../types';
import { 
  CheckCircle2, Clock, CircleDashed, XCircle, FileText, Download, 
  X, ExternalLink, RotateCcw, Maximize2, Upload, CheckCircle 
} from 'lucide-react';

export const TrackingView: React.FC = () => {
  const { 
    requests, selectedRequestForDetail, setSelectedRequestForDetail, 
    submitRevisionByRequester, currentUser, showToast, 
    setActiveTab, setFullScreenPreviewRequest, hasPrivilege 
  } = useApp();
  
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'needs_revision' | 'completed' | 'rejected' | 'related'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [submittingRevisionReq, setSubmittingRevisionReq] = useState<ApprovalRequest | null>(null);
  const [requesterNote, setRequesterNote] = useState('');
  const [newPdfFile, setNewPdfFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [revisionMode, setRevisionMode] = useState<'wording_only' | 'with_file'>('wording_only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [detailActiveDocType, setDetailActiveDocType] = useState<'WO' | 'PR' | 'PO'>('WO');
  const [detailBlobUrl, setDetailBlobUrl] = useState('');

  const myRequests = requests.filter(req => {
    return req.requesterId === currentUser?.id || req.requesterName.toLowerCase() === currentUser?.name.toLowerCase();
  });

  const relatedRequests = requests.filter(req => {
    const isApprover = req.flow.some(step => step.userId === currentUser.id);
    const hasSpecialAccess = hasPrivilege(req.category);
    return isApprover || hasSpecialAccess;
  });

  const filteredRequests = (filter === 'related' ? relatedRequests : myRequests).filter(req => {
    if (filter !== 'all' && filter !== 'related' && req.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return req.title.toLowerCase().includes(q) || req.id.toLowerCase().includes(q);
    }
    return true;
  });

  const getStepIcon = (status: ApproverStep['status']) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />;
      case 'waiting': return <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-400 animate-pulse" />;
      case 'needs_revision': return <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-600" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-600" />;
      default: return <CircleDashed className="w-3.5 h-3.5 md:w-4 md:h-4 text-neutral-300" />;
    }
  };

  const getStepBadge = (step: ApproverStep) => {
    switch (step.status) {
      case 'approved': return <span className="text-[9px] md:text-[10px] text-emerald-700 font-medium">Disetujui</span>;
      case 'waiting': return <span className="text-[9px] md:text-[10px] text-neutral-600 font-medium bg-neutral-100 px-1.5 py-0.5 rounded">Menunggu</span>;
      case 'needs_revision': return <span className="text-[9px] md:text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">Revisi</span>;
      case 'rejected': return <span className="text-[9px] md:text-[10px] text-rose-700 font-medium">Ditolak</span>;
      default: return <span className="text-[9px] md:text-[10px] text-neutral-400">Menunggu</span>;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Harap unggah file PDF.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewPdfFile({
        name: file.name,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSubmitRevision = async () => {
    if (!submittingRevisionReq) return;
    if (revisionMode === 'wording_only' && !requesterNote.trim()) {
      showToast('Harap isi catatan perbaikan jika tidak mengunggah file.', 'error');
      return;
    }
    if (revisionMode === 'with_file' && !newPdfFile) {
      showToast('Harap unggah dokumen PDF baru terlebih dahulu.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitRevisionByRequester(
        submittingRevisionReq.id,
        requesterNote.trim() || 'File dokumen telah diperbarui dan direvisi.',
        revisionMode === 'with_file' ? newPdfFile?.dataUrl : undefined,
        revisionMode === 'with_file' ? newPdfFile?.name : undefined
      );
      setSubmittingRevisionReq(null);
      setRequesterNote('');
      setNewPdfFile(null);
      setRevisionMode('wording_only');
    } catch (e: any) {
      showToast(e?.message || 'Gagal mengirim revisi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rawDetailUrl = detailActiveDocType === 'PR' && selectedRequestForDetail?.prPdfDataUrl
    ? selectedRequestForDetail.prPdfDataUrl
    : detailActiveDocType === 'PO' && selectedRequestForDetail?.poPdfDataUrl
    ? selectedRequestForDetail.poPdfDataUrl
    : selectedRequestForDetail?.pdfDataUrl || '';

  useEffect(() => {
    if (!rawDetailUrl) return;
    let isCancelled = false;
    let objectUrl = '';
    
    const loadBlobAsync = async () => {
      try {
        const fetchUrl = rawDetailUrl.startsWith('data:')
          ? rawDetailUrl
          : (rawDetailUrl.includes('?') ? `${rawDetailUrl}&t=${Date.now()}` : `${rawDetailUrl}?t=${Date.now()}`);
        
        const res = await fetch(fetchUrl);
        const blob = await res.blob();
        
        if (!isCancelled) {
          objectUrl = URL.createObjectURL(blob);
          setDetailBlobUrl(objectUrl);
        }
      } catch (err) {
        console.error('Konversi Blob gagal:', err);
      }
    };
    
    loadBlobAsync();
    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rawDetailUrl]);

  const needsRevisionCount = myRequests.filter(r => r.status === 'needs_revision').length;
  const hasRevisionHistory = selectedRequestForDetail?.revisionHistory && selectedRequestForDetail.revisionHistory.length > 0;
  const hasAuditNotes = selectedRequestForDetail?.auditNotes && selectedRequestForDetail.auditNotes.length > 0;
  const showNotesSection = hasRevisionHistory || hasAuditNotes;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 md:px-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <div className="flex items-center gap-2.5 md:gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">
              {filter === 'related' ? 'Dokumen Terkait' : 'Status Pengajuan'}
            </h1>
            <span className="px-2 py-0.5 text-[10px] md:text-[11px] font-semibold bg-neutral-100 text-neutral-600 rounded">
              {filter === 'related' ? relatedRequests.length : myRequests.length} Total
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-neutral-500 max-w-sm">
            {filter === 'related'
              ? 'Lacak dokumen di mana Anda berkontribusi sebagai approver atau memiliki akses khusus.'
              : 'Lacak dokumen dan progres persetujuan yang Anda ajukan.'}
          </p>
        </div>

        {/* FILTER BAR MINIMALIS */}
        {/* FILTER BAR MINIMALIS: OPSI 2 (SEGMENTED CONTROL FULL WIDTH) */}
        <div className="flex items-center w-full gap-0.5 p-1 bg-neutral-100/80 rounded-lg shrink-0 border border-neutral-200/50">
          <button onClick={() => setFilter('all')} className={`flex-1 flex justify-center py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all ${filter === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>Semua</button>
          <button onClick={() => setFilter('in_progress')} className={`flex-1 flex justify-center py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all ${filter === 'in_progress' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>Berjalan</button>
          <button onClick={() => setFilter('needs_revision')} className={`flex-1 flex justify-center py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all items-center gap-1 ${filter === 'needs_revision' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>
            <span>Revisi</span>
          </button>
          <button onClick={() => setFilter('completed')} className={`flex-1 flex justify-center py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all ${filter === 'completed' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}>Selesai</button>
          
          <span className="w-px h-3.5 bg-neutral-300 mx-0.5"></span>
          
          <button onClick={() => setFilter('related')} className={`flex-1 flex justify-center py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all ${filter === 'related' ? 'bg-[#0B1A28] text-white shadow-sm' : 'text-[#0B1A28] hover:bg-neutral-200'}`}>Terkait</button>
        </div>
      </div>

      {(myRequests.length > 0 || relatedRequests.length > 0) && (
        <div className="mb-5 md:mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nomor ID atau judul dokumen..."
            className="w-full sm:max-w-sm px-3.5 py-2.5 text-xs md:text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B1A28]"
          />
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 md:p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-neutral-400" />
          </div>
          <h3 className="text-sm md:text-base font-bold text-neutral-900 mb-1">Tidak Ditemukan</h3>
          <p className="text-xs md:text-sm text-neutral-500 max-w-sm mx-auto">
            Tidak ada dokumen yang cocok dengan filter atau pencarian Anda saat ini.
          </p>
          {filter !== 'related' && (
            <div className="mt-5">
              <button onClick={() => setActiveTab('pengajuan')} className="px-4 py-2.5 text-xs md:text-sm font-semibold bg-[#0B1A28] text-white rounded-lg hover:bg-[#152D40] transition-colors inline-flex items-center gap-1.5 shadow-sm">
                <span>Buat Pengajuan Baru</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredRequests.map(req => {
            const currentApprover = req.flow[req.currentStepIndex];
            const isCompleted = req.status === 'completed';
            const isNeedsRevision = req.status === 'needs_revision';
            const lastNote = (req.auditNotes || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
            return (
              <div key={req.id} className={`bg-white rounded-xl border p-4 md:p-5 transition-all shadow-sm ${isNeedsRevision && filter !== 'related' ? 'border-neutral-200 border-l-4 border-l-amber-400' : 'border-neutral-200 hover:border-neutral-300'}`}>
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 md:pb-4 border-b border-neutral-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-neutral-500 mb-1">
                      <span className="font-mono text-neutral-600 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">{req.id}</span>
                      <span className="text-neutral-300">•</span>
                      <span className="flex items-center gap-1">{new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {filter === 'related' && (
                        <>
                          <span className="text-neutral-300">•</span>
                          <span className="font-semibold text-[#0B1A28]">Oleh {req.requesterName}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-sm md:text-base font-bold text-neutral-900 truncate">{req.title}</h2>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs font-bold text-emerald-700 bg-emerald-50 rounded">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Selesai
                      </span>
                    ) : isNeedsRevision ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs font-bold text-amber-700 bg-amber-50 rounded">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-500" /> Perlu Perbaikan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs font-bold text-neutral-700 bg-neutral-50 border border-neutral-200 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" /> Menunggu {currentApprover?.userName}
                      </span>
                    )}
                  </div>
                </div>

                {isNeedsRevision && filter !== 'related' && (
                  <div className="mt-3 md:mt-4 p-3 md:p-4 bg-amber-50/60 border border-amber-100 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs md:text-sm font-bold text-neutral-900 mb-0.5">Catatan dari {req.lastRevisionRequestedBy || currentApprover?.userName}</div>
                        <p className="text-[11px] md:text-xs text-neutral-600">{req.notes || (lastNote ? `Hal ${lastNote.pageNumber}: ${lastNote.content}` : 'Terdapat perbaikan yang diperlukan.')}</p>
                      </div>
                      <button onClick={() => { setSubmittingRevisionReq(req); setRequesterNote(''); setNewPdfFile(null); setRevisionMode('with_file'); }} className="px-4 py-2 text-[11px] md:text-xs font-bold text-white bg-[#0B1A28] hover:bg-[#152D40] rounded-lg transition-colors shrink-0 whitespace-nowrap shadow-sm">
                        Tindak Lanjut
                      </button>
                    </div>
                  </div>
                )}

                <div className="py-3 md:py-4">
                  <div className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {req.flow.map((step, idx) => {
                      const isActive = step.status === 'waiting' || step.status === 'needs_revision';
                      return (
                        <div key={step.id} className={`flex-shrink-0 w-40 md:w-48 p-2.5 md:p-3 rounded-lg border flex flex-col ${isActive ? 'bg-white border-neutral-300 shadow-sm' : 'bg-neutral-50/50 border-neutral-200'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] md:text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Tahap {idx + 1}</span>
                            {getStepIcon(step.status)}
                          </div>
                          <div className="font-bold text-xs md:text-sm text-neutral-900 truncate">{step.userName}</div>
                          <div className="text-[10px] md:text-[11px] text-neutral-500 truncate mb-2.5 flex-1">{step.roleTitle}</div>
                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 mt-auto">
                            {getStepBadge(step)}
                            {step.signedAt && (
                              <span className="text-[8px] md:text-[9px] font-semibold text-neutral-400 tracking-tight">
                                {new Date(step.signedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(step.signedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-semibold text-neutral-500 truncate max-w-[180px] sm:max-w-sm bg-neutral-50 px-2 py-1 rounded">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate">{req.pdfFileName} {req.prPdfFileName ? `+ PR` : ''} {req.poPdfFileName ? `+ PO` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    <button onClick={() => { setSelectedRequestForDetail(req); setDetailActiveDocType('WO'); }} className="px-2.5 py-1.5 text-[11px] md:text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-md transition-colors">
                      Detail Riwayat
                    </button>
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="px-2.5 py-1.5 text-[11px] md:text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 rounded-md transition-colors">
                      Buka Dokumen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: SUBMIT REVISI */}
      {submittingRevisionReq && (
        <div className="fixed inset-0 z-[60] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 md:p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Kirim Perbaikan</h3>
                <span className="text-[10px] text-neutral-500 font-mono mt-0.5 block">{submittingRevisionReq.id}</span>
              </div>
              <button onClick={() => setSubmittingRevisionReq(null)} className="text-neutral-400 hover:text-neutral-800 p-1 hover:bg-neutral-100 rounded-lg">
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-[11px] md:text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">Tindakan Perbaikan</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  <label className={`flex flex-col gap-1 p-2.5 md:p-3 border rounded-xl cursor-pointer transition-all ${revisionMode === 'wording_only' ? 'border-[#0B1A28] bg-neutral-50/50 ring-1 ring-[#0B1A28]' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="revisionMode" value="wording_only" checked={revisionMode === 'wording_only'} onChange={() => { setRevisionMode('wording_only'); setNewPdfFile(null); }} className="accent-[#0B1A28] cursor-pointer" />
                      <span className="text-xs md:text-sm font-bold text-neutral-900">Hanya Balasan</span>
                    </div>
                    <span className="text-[9px] md:text-[10px] text-neutral-500 pl-5 leading-relaxed">Kirim penjelasan tanpa mengganti dokumen.</span>
                  </label>
                  <label className={`flex flex-col gap-1 p-2.5 md:p-3 border rounded-xl cursor-pointer transition-all ${revisionMode === 'with_file' ? 'border-[#0B1A28] bg-neutral-50/50 ring-1 ring-[#0B1A28]' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="revisionMode" value="with_file" checked={revisionMode === 'with_file'} onChange={() => setRevisionMode('with_file')} className="accent-[#0B1A28] cursor-pointer" />
                      <span className="text-xs md:text-sm font-bold text-neutral-900">Unggah File</span>
                    </div>
                    <span className="text-[9px] md:text-[10px] text-neutral-500 pl-5 leading-relaxed">Ganti dokumen dengan versi yang direvisi.</span>
                  </label>
                </div>
              </div>
              
              {revisionMode === 'with_file' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] md:text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">File Revisi (PDF)</label>
                  <div onClick={() => document.getElementById('revision-file-upload')?.click()} className="border-2 border-dashed border-neutral-200 rounded-xl p-4 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition-colors cursor-pointer text-center">
                    <input id="revision-file-upload" type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
                    {newPdfFile ? (
                      <div className="flex flex-col items-center justify-center gap-1 text-emerald-700">
                        <CheckCircle className="w-5 h-5 mb-0.5" />
                        <span className="text-xs font-bold truncate max-w-full px-2">{newPdfFile.name}</span>
                        <span className="text-[9px] md:text-[10px] text-emerald-600/80 font-semibold">File berhasil dilampirkan</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-neutral-500">
                        <Upload className="w-5 h-5 mb-1.5 text-neutral-400" />
                        <span className="text-xs md:text-sm font-bold text-neutral-700">Pilih file PDF revisi</span>
                        <span className="text-[9px] md:text-[10px] mt-0.5">atau ketuk di sini</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-[11px] md:text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Catatan Balasan
                </label>
                <textarea value={requesterNote} onChange={e => setRequesterNote(e.target.value)} placeholder={revisionMode === 'with_file' ? "Contoh: Telah diperbaiki sesuai arahan..." : "Jelaskan mengapa file tidak diubah..."} rows={3} className={`w-full p-3 text-xs md:text-sm bg-white border rounded-xl text-neutral-900 transition-colors focus:outline-none focus:ring-1 focus:ring-[#0B1A28] resize-none ${revisionMode === 'wording_only' && !requesterNote.trim() && isSubmitting ? 'border-rose-300 ring-rose-300' : 'border-neutral-200'}`} />
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[9px] md:text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Tahap {submittingRevisionReq.currentStepIndex + 1} / {submittingRevisionReq.flow.length}
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSubmittingRevisionReq(null)} className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">Batal</button>
                <button type="button" onClick={handleConfirmSubmitRevision} disabled={isSubmitting || (revisionMode === 'wording_only' && !requesterNote.trim()) || (revisionMode === 'with_file' && !newPdfFile)} className="px-4 py-2 text-xs font-bold text-white bg-[#0B1A28] hover:bg-[#152D40] rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm">
                  {isSubmitting ? 'Memproses...' : 'Kirim Balasan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL MINIMALIS */}
      {selectedRequestForDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="px-4 md:px-6 py-4 flex items-start justify-between bg-white border-b border-neutral-100 shrink-0">
              <div className="min-w-0 pr-4">
                <span className="text-[9px] md:text-[10px] font-mono font-bold text-neutral-400 block mb-0.5">{selectedRequestForDetail.id}</span>
                <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight truncate">{selectedRequestForDetail.title}</h3>
              </div>
              <button onClick={() => setSelectedRequestForDetail(null)} className="p-1.5 shrink-0 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-neutral-50/50">
              {showNotesSection && (
                <div>
                  <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">Catatan & Riwayat Perbaikan</h4>
                  <div className="space-y-2.5">
                    {selectedRequestForDetail.revisionHistory?.map(rev => (
                      <div key={rev.id} className="p-3 md:p-4 rounded-xl border bg-amber-50/50 border-amber-200/70 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-neutral-900">Dari {rev.requestedByUserName} <span className="hidden sm:inline">({rev.requestedByUserRole})</span></span>
                          <span className="text-[9px] md:text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                            {new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-neutral-700 font-medium mb-2 leading-relaxed">{rev.generalNote}</p>
                        {rev.resolvedAt && (
                          <div className="mt-2 pt-2 border-t border-amber-200/50 text-[10px] md:text-[11px] text-neutral-600 leading-relaxed">
                            <span className="font-bold text-emerald-700">Dibalas oleh {rev.resolvedByRequesterName}:</span> "{rev.requesterResponseNote}"
                          </div>
                        )}
                      </div>
                    ))}
                    {selectedRequestForDetail.auditNotes?.map(note => (
                      <div key={note.id} className="p-3 md:p-4 rounded-xl border bg-white border-neutral-200/70 text-xs shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-neutral-900">{note.authorName} <span className="text-neutral-500 font-semibold">(Hal {note.pageNumber})</span></span>
                          <span className="text-[9px] md:text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                            {new Date(note.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-neutral-600 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                  <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-1">
                    <button onClick={() => setDetailActiveDocType('WO')} className={`text-[11px] md:text-xs font-bold pb-1 transition-all whitespace-nowrap ${detailActiveDocType === 'WO' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}>
                      {selectedRequestForDetail.category === 'Design' ? 'Design Drawing' : 'WO Existing'}
                    </button>
                    {selectedRequestForDetail.prPdfDataUrl && (
                      <button onClick={() => setDetailActiveDocType('PR')} className={`text-[11px] md:text-xs font-bold pb-1 transition-all whitespace-nowrap ${detailActiveDocType === 'PR' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}>
                        Purch. Request
                      </button>
                    )}
                    {selectedRequestForDetail.poPdfDataUrl && (
                      <button onClick={() => setDetailActiveDocType('PO')} className={`text-[11px] md:text-xs font-bold pb-1 transition-all whitespace-nowrap ${detailActiveDocType === 'PO' ? 'border-b-2 border-neutral-900 text-neutral-900' : 'text-neutral-400 hover:text-neutral-700'}`}>
                        Purch. Order
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 shrink-0 bg-neutral-100/80 px-3 py-1.5 rounded-lg sm:bg-transparent sm:px-0 sm:py-0">
                    <a href={rawDetailUrl} download={detailActiveDocType === 'PR' ? `PR_${selectedRequestForDetail.prPdfFileName}` : detailActiveDocType === 'PO' ? `PO_${selectedRequestForDetail.poPdfFileName}` : `${selectedRequestForDetail.category === 'Design' ? 'Design' : 'WO'}_${selectedRequestForDetail.pdfFileName}`} className="text-[10px] md:text-[11px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1 font-bold transition-colors">
                      <Download className="w-3.5 h-3.5" /> Unduh
                    </a>
                    <span className="text-neutral-300">|</span>
                    <button type="button" onClick={() => { setFullScreenPreviewRequest(selectedRequestForDetail); setSelectedRequestForDetail(null); }} className="text-[10px] md:text-[11px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1 font-bold transition-colors">
                      <Maximize2 className="w-3.5 h-3.5" /> Layar Penuh
                    </button>
                  </div>
                </div>
                
                <div className="w-full h-[300px] md:h-[400px] border border-neutral-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                  {detailBlobUrl ? (
                    <iframe src={`${detailBlobUrl}#toolbar=0&navpanes=0&view=FitH`} title="PDF Preview" className="w-full h-full border-0" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="w-6 h-6 md:w-8 md:h-8 border-[3px] border-neutral-200 border-t-[#0B1A28] rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2.5">Histori Otorisasi</h4>
                <div className="border border-neutral-200/80 rounded-xl overflow-hidden divide-y divide-neutral-100 bg-white shadow-sm">
                  {selectedRequestForDetail.flow.map(step => (
                    <div key={step.id} className="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-neutral-50/50 transition-colors">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 border border-neutral-200/80 shrink-0">
                          {step.userName[0]}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5">
                            <span className="font-bold text-neutral-900 text-xs md:text-sm">{step.userName}</span>
                            <span className="text-neutral-300 hidden sm:inline">•</span>
                            <span className="text-neutral-500 font-semibold text-[10px] md:text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{step.roleTitle}</span>
                          </div>
                          <div className="text-[9px] md:text-[10px] text-neutral-500 font-medium mt-1">
                            {step.status === 'approved' ? `Disetujui pada ${new Date(step.signedAt || '').toLocaleString('id-ID')}` : step.status === 'waiting' ? 'Sedang tahap review' : step.status === 'needs_revision' ? 'Memberikan catatan revisi' : 'Menunggu giliran'}
                          </div>
                        </div>
                      </div>
                      <div className="pl-11 sm:pl-0">
                        {step.signatureUrl ? (
                          <img src={step.signatureUrl} alt="TTD" className="h-6 md:h-8 w-auto min-w-[50px] object-contain opacity-90 mix-blend-multiply" />
                        ) : <span className="text-neutral-300 text-[10px] md:text-xs italic font-semibold">Belum TTD</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};