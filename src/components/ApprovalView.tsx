import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import { SignatureModal } from './SignatureModal';
import { 
  CheckCircle, FileText, ArrowRight, AlertCircle, 
  RotateCcw, Check, X, Upload 
} from 'lucide-react';

export const ApprovalView: React.FC = () => {
  const {
    requests, currentUser, performAutoSignApproval, uploadPRAndForward,
    uploadPOAndComplete, rejectPRToMega, rejectRequest, setActiveTab, showToast, setFullScreenPreviewRequest,
  } = useApp();

  const [signingId, setSigningId] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [uploads, setUploads] = useState<Record<string, { name: string, url: string }>>({});
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  
  // PERBAIKAN: State untuk mengontrol pop-up modal tanda tangan
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const incomingRequests = requests.filter(r => {
    if (r.status !== 'in_progress') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  });

  const waitingRevisionRequests = requests.filter(r => {
    if (r.status !== 'needs_revision') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  });

  const handleOneClickSign = async (req: ApprovalRequest) => {
    if (!currentUser.signatureBase64) {
      showToast('Tanda tangan digital belum diatur.', 'error');
      // PERBAIKAN: Munculkan pop-up alih-alih pindah halaman
      setShowSignatureModal(true);
      return;
    }
    setSigningId(req.id);
    try {
      const result = await performAutoSignApproval(req.id);
      if (result.success) {
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menandatangani dokumen.', 'error');
    } finally {
      setSigningId(null);
    }
  };

  const processFileUpload = (reqId: string, file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return showToast('Harap unggah file berformat PDF.', 'error');
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploads(prev => ({
        ...prev,
        [reqId]: { name: file.name, url: reader.result as string }
      }));
    };
    reader.readAsDataURL(file);
  };

  const executeUploadPR = (reqId: string) => {
    const upload = uploads[reqId];
    if (!upload?.url) return showToast('Harap unggah file PR terlebih dahulu.', 'error');
    uploadPRAndForward(reqId, upload.name, upload.url);
    setUploads(prev => { const next = { ...prev }; delete next[reqId]; return next; });
  };

  const executeUploadPO = async (reqId: string) => {
    const upload = uploads[reqId];
    if (!upload?.url) return showToast('Harap unggah file PO terlebih dahulu.', 'error');
    await uploadPOAndComplete(reqId, upload.name, upload.url);
    setUploads(prev => { const next = { ...prev }; delete next[reqId]; return next; });
  };

  const handleConfirmReject = () => {
    if (!rejectingReq) return;
    if (rejectingReq.category === 'WO Existing' && rejectingReq.currentStepIndex === 5) {
      rejectPRToMega(rejectingReq.id, rejectReason || 'Perbaikan PR diminta oleh User');
    } else {
      rejectRequest(rejectingReq.id, rejectReason || 'Ditolak oleh approver');
    }
    setRejectingReq(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Antrean Persetujuan
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-600 rounded">
              {incomingRequests.length} Menunggu
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Dokumen yang membutuhkan tinjauan dan tanda tangan Anda.
          </p>
        </div>
      </div>

      {!currentUser.signatureBase64 && (
        <div className="mb-6 p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Tanda tangan digital belum diatur.</span> Anda perlu membuat tanda tangan sebelum menyetujui dokumen.
            </div>
          </div>
          {/* PERBAIKAN: Ubah aksi tombol dari ganti tab menjadi buka modal */}
          <button onClick={() => setShowSignatureModal(true)} className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0 shadow-sm">
            Atur Tanda Tangan
          </button>
        </div>
      )}

      {waitingRevisionRequests.length > 0 && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="text-sm text-neutral-700">
              <span className="font-semibold text-neutral-900">
                Menunggu Perbaikan Pengaju ({waitingRevisionRequests.length} Dokumen):
              </span>
              <ul className="mt-1.5 space-y-1 text-neutral-600 list-disc list-inside">
                {waitingRevisionRequests.map(r => (
                  <li key={r.id}>
                    <span className="font-medium text-neutral-800">{r.title}</span> — Sedang diperbaiki oleh {r.requesterName}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {incomingRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 sm:p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-neutral-400" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">Antrean Kosong</h2>
          <p className="text-sm text-neutral-500 max-w-md mx-auto mt-1">Tidak ada dokumen yang menunggu persetujuan Anda saat ini.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setActiveTab('tracking')} className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors shadow-sm">Lihat Riwayat</button>
            <button onClick={() => setActiveTab('pengajuan')} className="px-4 py-2 text-sm font-medium bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors">Buat Pengajuan Baru</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {incomingRequests.map(req => {
            const stepIndex = req.currentStepIndex;
            const currentStep = req.flow[stepIndex];
            const isSigning = signingId === req.id;
            const isStep5PRUpload = req.category === 'WO Existing' && stepIndex === 4;
            const isStep8POUpload = req.category === 'WO Existing' && stepIndex === 7;
            const isStep6UserPR = req.category === 'WO Existing' && stepIndex === 5;
            const latestHistory = req.revisionHistory && req.revisionHistory.length > 0 ? req.revisionHistory[req.revisionHistory.length - 1] : null;
            const hasRecentRequesterResponse = latestHistory && latestHistory.resolvedAt;
            const upload = uploads[req.id];
            const isDraggingCard = dragActiveId === req.id;

            return (
              <div key={req.id} className="bg-white rounded-xl border border-neutral-200 p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-5 pb-4 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5">
                      <span className="font-mono text-neutral-900 font-medium">{req.id}</span>
                      <span>·</span>
                      <span>Dari <strong className="font-semibold text-neutral-900">{req.requesterName}</strong></span>
                    </div>
                    <h3 className="text-base font-bold text-neutral-900">{req.title}</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Tahap {stepIndex + 1} / {req.flow.length}</div>
                    <div className="text-xs font-medium text-neutral-900">{currentStep.roleTitle}</div>
                  </div>
                </div>

                {hasRecentRequesterResponse && (
                  <div className="mb-4 p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
                    <span className="font-semibold text-neutral-900">Perbaikan dari {latestHistory.resolvedByRequesterName}: </span>
                    <span className="text-neutral-600">"{latestHistory.requesterResponseNote}"</span>
                  </div>
                )}

                <div className="space-y-2 mb-5">
                  <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0"/>
                      <div>
                        <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                          {req.category === 'Design' ? 'Design Drawing' : 'WO Existing'}
                        </div>
                        <div className="text-sm font-medium text-neutral-900">{req.pdfFileName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={req.pdfDataUrl} download={req.pdfFileName} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-md">Unduh</a>
                      <button onClick={() => setFullScreenPreviewRequest(req)} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md">Tinjau</button>
                    </div>
                  </div>

                  {req.prPdfFileName && req.prPdfDataUrl && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-neutral-400 shrink-0"/>
                        <div>
                          <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Purchase Request</div>
                          <div className="text-sm font-medium text-neutral-900">{req.prPdfFileName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={req.prPdfDataUrl} download={req.prPdfFileName} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-md">Unduh</a>
                        <button onClick={() => setFullScreenPreviewRequest(req)} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md">Tinjau</button>
                      </div>
                    </div>
                  )}

                  {req.poPdfFileName && req.poPdfDataUrl && (
                    <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-neutral-400 shrink-0"/>
                        <div>
                          <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Purchase Order</div>
                          <div className="text-sm font-medium text-neutral-900">{req.poPdfFileName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={req.poPdfDataUrl} download={req.poPdfFileName} className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-md">Unduh</a>
                        <button onClick={() => setFullScreenPreviewRequest(req)} className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md">Tinjau</button>
                      </div>
                    </div>
                  )}
                </div>

                {isStep5PRUpload || isStep8POUpload ? (
                  <div className="pt-2">
                    <h4 className="text-xs font-bold text-neutral-900 mb-2 uppercase tracking-wide">
                      {isStep5PRUpload ? 'Lampirkan Purchase Request (PR)' : 'Lampirkan Purchase Order (PO)'}
                    </h4>
                    <input
                      type="file"
                      accept=".pdf"
                      id={`file-upload-${req.id}`}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) processFileUpload(req.id, e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                    {!upload?.url ? (
                      <label
                        htmlFor={`file-upload-${req.id}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActiveId(req.id); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragActiveId(null); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragActiveId(null);
                          if(e.dataTransfer.files?.[0]) processFileUpload(req.id, e.dataTransfer.files[0]);
                        }}
                        className={`w-full py-10 border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDraggingCard ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 bg-white hover:bg-neutral-50'}`}
                      >
                        <Upload className="w-5 h-5 text-neutral-400"/>
                        <div className="text-xs text-neutral-600">
                          <span className="font-semibold text-neutral-900">Klik untuk unggah</span> atau seret file PDF ke sini
                        </div>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-neutral-400 shrink-0"/>
                          <span className="text-xs font-medium text-neutral-900 truncate">{upload.name}</span>
                        </div>
                        <button
                          onClick={() => setUploads(prev => { const next = {...prev}; delete next[req.id]; return next; })}
                          className="text-rose-600 hover:text-rose-700 text-xs font-medium shrink-0 p-1"
                        >
                          <X className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => isStep5PRUpload ? executeUploadPR(req.id) : executeUploadPO(req.id)}
                      disabled={!upload?.url}
                      className="mt-3 w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isStep5PRUpload ? 'Kirim ke User' : 'Sahkan PO'} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 text-xs font-medium rounded-lg transition-colors">
                      Tinjau Dokumen
                    </button>
                    <button onClick={() => handleOneClickSign(req)} disabled={isSigning || !currentUser.signatureBase64} className="py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {isSigning ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Memproses...</span></>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /><span>Setujui & Tanda Tangani</span></>
                      )}
                    </button>
                  </div>
                )}
                {!isStep5PRUpload && !isStep8POUpload && (
                  <div className="mt-4 pt-4 border-t border-neutral-100 text-right">
                    <button onClick={() => setRejectingReq(req)} className="text-xs font-medium text-rose-600 hover:text-rose-700">
                      {isStep6UserPR ? 'Kembalikan PR ke Purchasing' : 'Tolak Dokumen'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">
                {rejectingReq.category === 'WO Existing' && rejectingReq.currentStepIndex === 5 ? 'Kembalikan PR' : 'Tolak Dokumen'}
              </h3>
              <button onClick={() => setRejectingReq(null)} className="text-neutral-400 hover:text-neutral-800"><X className="w-4 h-4" /></button>
            </div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Tulis alasan..." rows={3} className="w-full p-3 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 mb-4 transition-colors" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingReq(null)} className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors">Batal</button>
              <button onClick={handleConfirmReject} className="px-4 py-2 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm">Kirim Penolakan</button>
            </div>
          </div>
        </div>
      )}

      {/* PERBAIKAN: Menempatkan komponen modal di struktur paling bawah */}
      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} />
    </div>
  );
};