import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import { SignatureModal } from './SignatureModal';
import { CheckCircle, FileText, AlertCircle, RotateCcw, Check, Eye } from 'lucide-react';

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
    <div className="max-w-5xl mx-auto py-6 px-4 md:py-8 md:px-6">
      
      {/* HEADER: Font diperkecil untuk Mobile, kembali besar di Desktop */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 tracking-tight">Antrean Persetujuan</h1>
        <p className="text-xs md:text-sm text-neutral-500 mt-1">
          Dokumen yang membutuhkan tinjauan dan tanda tangan Anda.
        </p>
      </div>

      {!currentUser.signatureBase64 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              <strong className="font-semibold">Tanda tangan belum diatur.</strong> Anda perlu membuat tanda tangan sebelum menyetujui dokumen.
            </p>
          </div>
          <button onClick={() => setShowSignatureModal(true)} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm">
            Atur Tanda Tangan
          </button>
        </div>
      )}

      {waitingRevisionRequests.length > 0 && (
        <div className="mb-6 md:mb-8 border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-neutral-50 p-3 md:p-4 border-b border-neutral-200 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-neutral-600" />
            <h2 className="text-xs md:text-sm font-bold text-neutral-800">Menunggu Perbaikan Pengaju ({waitingRevisionRequests.length})</h2>
          </div>
          <div className="p-3 md:p-4 bg-white space-y-2.5">
            {waitingRevisionRequests.map(r => (
              <div key={r.id} className="p-3 border border-neutral-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-50/50">
                <span className="font-semibold text-xs md:text-sm text-neutral-900 truncate pr-4">{r.title}</span>
                <span className="text-[10px] md:text-xs font-medium text-neutral-500 whitespace-nowrap bg-white px-2 py-1 rounded border border-neutral-100">Oleh {r.requesterName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {incomingRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-8 md:p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-100">
            <Check className="w-6 h-6 text-neutral-400" />
          </div>
          <h2 className="text-base md:text-lg font-bold text-neutral-900 mb-1.5">Antrean Kosong</h2>
          <p className="text-neutral-500 text-xs md:text-sm mb-6 max-w-sm mx-auto">Tidak ada dokumen yang menunggu persetujuan Anda saat ini.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={() => setActiveTab('tracking')} className="px-5 py-2.5 text-xs md:text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors shadow-sm">
              Lihat Riwayat
            </button>
            <button onClick={() => setActiveTab('pengajuan')} className="px-5 py-2.5 text-xs md:text-sm font-semibold bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg transition-colors shadow-sm">
              Buat Pengajuan Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {incomingRequests.map(req => {
            const stepIndex = req.currentStepIndex;
            const currentStep = req.flow[stepIndex];
            const isSigning = signingId === req.id;
            
            const latestHistory = req.revisionHistory && req.revisionHistory.length > 0 ? req.revisionHistory[req.revisionHistory.length - 1] : null;
            const hasRecentRequesterResponse = latestHistory && latestHistory.resolvedAt;

            return (
              <div key={req.id} className="bg-white rounded-xl border border-neutral-200 p-4 md:p-6 shadow-sm">
                
                <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4 mb-4 md:mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] md:text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">{req.id}</span>
                      <span className="text-[10px] md:text-xs text-neutral-500 font-medium">Dari {req.requesterName}</span>
                    </div>
                    {/* Ukuran font judul dokumen dirampingkan sedikit di Mobile */}
                    <h3 className="text-base md:text-lg font-bold text-neutral-900 leading-tight">{req.title}</h3>
                  </div>
                  <div className="text-left sm:text-right mt-1 sm:mt-0 bg-neutral-50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-neutral-100">
                    <p className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">TAHAP {stepIndex + 1} / {req.flow.length}</p>
                    <p className="text-xs md:text-sm font-semibold text-neutral-700">{currentStep.roleTitle}</p>
                  </div>
                </div>

                {hasRecentRequesterResponse && (
                  <div className="mb-4 md:mb-5 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-xs md:text-sm">
                    <span className="font-bold text-blue-900 block mb-0.5">Balasan dari {latestHistory.resolvedByRequesterName}:</span>
                    <span className="text-blue-800 italic">"{latestHistory.requesterResponseNote}"</span>
                  </div>
                )}

                <div className="mb-5 flex flex-col sm:flex-row items-center justify-between p-3 border border-neutral-100 rounded-xl bg-neutral-50/80 gap-3 md:gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-5 h-5 text-neutral-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                        {req.category === 'Design' ? 'Design Drawing' : 'In General'}
                      </p>
                      <p className="text-xs md:text-sm font-semibold text-neutral-800 truncate">{req.pdfFileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="flex-1 sm:flex-none px-4 py-2 text-[11px] md:text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors text-center">
                      Tinjau
                    </button>
                    <a href={req.pdfDataUrl} download={req.pdfFileName} className="flex-1 sm:flex-none px-4 py-2 text-[11px] md:text-xs font-bold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors text-center shadow-sm">
                      Unduh
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex flex-col-reverse md:flex-row items-center justify-between gap-3">
                  <button onClick={() => setRejectingReq(req)} className="w-full md:w-auto px-4 py-2.5 md:py-2 text-[11px] md:text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors text-center">
                    Tolak Dokumen
                  </button>
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="w-full sm:w-auto px-5 py-2.5 text-xs md:text-sm font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition-colors text-center shadow-sm">
                      Buka Dokumen
                    </button>
                    <button onClick={() => handleOneClickSign(req)} disabled={isSigning || !currentUser.signatureBase64} className="w-full sm:w-auto px-5 py-2.5 text-xs md:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                      {isSigning ? (
                        <><div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" /><span>Memproses...</span></>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /><span>Setujui Dokumen</span></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-neutral-900 mb-1.5">Tolak Dokumen</h3>
            <p className="text-xs text-neutral-500 mb-4">Berikan alasan agar pengaju dapat melakukan perbaikan.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ketik alasan penolakan di sini..."
              rows={4}
              className="w-full p-3 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 mb-5 resize-none transition-colors"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingReq(null)} className="px-5 py-2.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
                Batal
              </button>
              <button onClick={handleConfirmReject} className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm">
                Tolak Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}
      
      <SignatureModal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} />
    </div>
  );
};