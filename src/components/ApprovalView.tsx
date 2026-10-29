import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import { SignatureModal } from './SignatureModal';
import { 
  CheckCircle, FileText, AlertCircle, 
  RotateCcw, Check, X, Eye, FileDown
} from 'lucide-react';

export const ApprovalView: React.FC = () => {
  const { 
    requests, currentUser, performAutoSignApproval, 
    rejectRequest, setActiveTab, showToast, setFullScreenPreviewRequest,
  } = useApp();
  
  const [signingId, setSigningId] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
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

  const handleConfirmReject = () => {
    if (!rejectingReq) return;
    rejectRequest(rejectingReq.id, rejectReason || 'Ditolak oleh approver');
    setRejectingReq(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-normal text-neutral-800 tracking-tight">
          Antrean Persetujuan
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Tinjau dan setujui dokumen yang membutuhkan otorisasi Anda.
        </p>
      </div>

      {!currentUser.signatureBase64 && (
        <div className="mb-8 p-5 bg-amber-50 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-amber-100/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-900">
              <span className="font-semibold block sm:inline">Tanda tangan digital belum diatur. </span> 
              Anda perlu membuatnya sebelum menyetujui dokumen.
            </div>
          </div>
          <button onClick={() => setShowSignatureModal(true)} className="px-6 py-2.5 text-sm font-medium bg-amber-700 hover:bg-amber-800 text-white rounded-full transition-colors shrink-0">
            Atur Sekarang
          </button>
        </div>
      )}

      {waitingRevisionRequests.length > 0 && (
        <div className="mb-8 p-5 bg-neutral-50 rounded-[24px] border border-neutral-200/60">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-neutral-200/70 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-neutral-700" />
            </div>
            <div className="text-sm text-neutral-700 w-full">
              <span className="font-semibold text-neutral-900 block mb-1">
                Menunggu Perbaikan Pengaju ({waitingRevisionRequests.length})
              </span>
              <div className="space-y-2 mt-2">
                {waitingRevisionRequests.map(r => (
                  <div key={r.id} className="bg-white p-3 rounded-2xl border border-neutral-100 flex items-center justify-between">
                    <span className="font-medium text-neutral-800 truncate pr-4">{r.title}</span>
                    <span className="text-xs text-neutral-500 whitespace-nowrap">Oleh {r.requesterName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {incomingRequests.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-neutral-200/60 p-16 text-center shadow-sm">
          <div className="w-32 h-32 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-normal text-neutral-800 mb-2">Semua Selesai</h2>
          <p className="text-neutral-500 max-w-sm mx-auto mb-8">Tidak ada dokumen yang menunggu persetujuan Anda saat ini. Selamat menikmati hari Anda!</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => setActiveTab('pengajuan')} className="px-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
              Buat Pengajuan Baru
            </button>
            <button onClick={() => setActiveTab('tracking')} className="px-6 py-2.5 text-sm font-medium bg-transparent text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              Lihat Riwayat
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {incomingRequests.map(req => {
            const stepIndex = req.currentStepIndex;
            const currentStep = req.flow[stepIndex];
            const isSigning = signingId === req.id;
            
            const latestHistory = req.revisionHistory && req.revisionHistory.length > 0 ? req.revisionHistory[req.revisionHistory.length - 1] : null;
            const hasRecentRequesterResponse = latestHistory && latestHistory.resolvedAt;

            // Inisial untuk Avatar ala Google
            const requesterInitial = req.requesterName.charAt(0).toUpperCase();

            return (
              <div key={req.id} className="bg-white rounded-[28px] border border-neutral-200/60 p-6 sm:p-8 hover:shadow-md transition-shadow">
                
                {/* Header Card ala Google */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                      {requesterInitial}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-neutral-900 leading-tight mb-1">{req.title}</h3>
                      <div className="text-sm text-neutral-500 flex items-center gap-2 flex-wrap">
                        <span className="text-neutral-900 font-medium">{req.requesterName}</span>
                        <span>•</span>
                        <span>{req.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-right sm:text-center w-fit sm:w-auto shrink-0 self-start">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Tahap {stepIndex + 1} / {req.flow.length}</div>
                    <div className="text-xs font-medium">{currentStep.roleTitle}</div>
                  </div>
                </div>

                {hasRecentRequesterResponse && (
                  <div className="mb-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50 text-sm flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-neutral-600">{latestHistory.resolvedByRequesterName?.charAt(0)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-900 block mb-0.5">Catatan Perbaikan:</span>
                      <span className="text-neutral-600 leading-relaxed">"{latestHistory.requesterResponseNote}"</span>
                    </div>
                  </div>
                )}

                {/* File Attachment ala Google Drive */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:pr-4 bg-white border border-neutral-200 rounded-[20px] hover:bg-neutral-50 transition-colors gap-4">
                    <div className="flex items-center gap-4 min-w-0 px-2">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-rose-600"/>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-neutral-900 truncate mb-0.5">{req.pdfFileName}</div>
                        <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                          {req.category === 'Design' ? 'Design Drawing' : 'In General'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-14 sm:pl-0">
                      <button onClick={() => setFullScreenPreviewRequest(req)} className="p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 rounded-full transition-colors tooltip-trigger" title="Tinjau Layar Penuh">
                        <Eye className="w-5 h-5" />
                      </button>
                      <a href={req.pdfDataUrl} download={req.pdfFileName} className="p-2 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 rounded-full transition-colors" title="Unduh File">
                        <FileDown className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Action Bar ala Material 3 */}
                <div className="pt-5 border-t border-neutral-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                  <button onClick={() => setRejectingReq(req)} className="w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors text-center">
                    Tolak Dokumen
                  </button>
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-medium text-blue-700 border border-neutral-300 hover:bg-blue-50 transition-colors text-center">
                      Tinjau Dokumen
                    </button>
                    <button onClick={() => handleOneClickSign(req)} disabled={isSigning || !currentUser.signatureBase64} className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow">
                      {isSigning ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Memproses...</span></>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /><span>Setujui & Tanda Tangani</span></>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Penolakan ala Google Material */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] max-w-sm w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-normal text-neutral-900 mb-4">Tolak Dokumen</h3>
            <p className="text-sm text-neutral-600 mb-5">Berikan alasan penolakan agar pengaju dapat melakukan perbaikan yang sesuai.</p>
            
            <textarea 
              value={rejectReason} 
              onChange={e => setRejectReason(e.target.value)} 
              placeholder="Tulis alasan penolakan..." 
              rows={4} 
              className="w-full p-4 text-sm bg-white border border-neutral-300 rounded-[16px] focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 mb-6 transition-colors resize-none" 
            />
            
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingReq(null)} className="px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-full transition-colors">
                Batal
              </button>
              <button onClick={handleConfirmReject} className="px-5 py-2.5 text-sm font-medium bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors shadow-sm">
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} />
    </div>
  );
};