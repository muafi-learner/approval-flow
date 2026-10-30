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
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Antrean Persetujuan</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Dokumen yang membutuhkan tinjauan dan tanda tangan Anda.
        </p>
      </div>

      {!currentUser.signatureBase64 && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              <strong className="font-semibold">Tanda tangan digital belum diatur.</strong> Anda perlu membuat tanda tangan sebelum menyetujui dokumen.
            </p>
          </div>
          <button onClick={() => setShowSignatureModal(true)} className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap">
            Atur Tanda Tangan
          </button>
        </div>
      )}

      {waitingRevisionRequests.length > 0 && (
        <div className="mb-8 border border-neutral-200 rounded-xl overflow-hidden">
          <div className="bg-neutral-50 p-4 border-b border-neutral-200 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-neutral-600" />
            <h2 className="text-sm font-bold text-neutral-800">Menunggu Perbaikan Pengaju ({waitingRevisionRequests.length})</h2>
          </div>
          <div className="p-4 bg-white space-y-3">
            {waitingRevisionRequests.map(r => (
              <div key={r.id} className="p-3 border border-neutral-200 rounded-lg flex items-center justify-between">
                <span className="font-medium text-sm text-neutral-900 truncate pr-4">{r.title}</span>
                <span className="text-xs text-neutral-500 whitespace-nowrap">Oleh {r.requesterName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {incomingRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center shadow-sm">
          <Check className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Antrean Kosong</h2>
          <p className="text-neutral-500 text-sm mb-6">Tidak ada dokumen yang menunggu persetujuan Anda saat ini.</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setActiveTab('tracking')} className="px-4 py-2 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors">
              Lihat Riwayat
            </button>
            <button onClick={() => setActiveTab('pengajuan')} className="px-4 py-2 text-sm font-medium bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg transition-colors">
              Buat Pengajuan Baru
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

            return (
              <div key={req.id} className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
                
                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-neutral-500">{req.id}</span>
                      <span className="text-neutral-300">•</span>
                      <span className="text-xs text-neutral-500">Dari {req.requesterName}</span>
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900">{req.title}</h3>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">TAHAP {stepIndex + 1} / {req.flow.length}</p>
                    <p className="text-sm font-semibold text-neutral-700">{currentStep.roleTitle}</p>
                  </div>
                </div>

                {hasRecentRequesterResponse && (
                  <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
                    <span className="font-bold text-neutral-800 block mb-1">Catatan Perbaikan dari {latestHistory.resolvedByRequesterName}:</span>
                    <span className="text-neutral-600">"{latestHistory.requesterResponseNote}"</span>
                  </div>
                )}

                <div className="mb-6 flex flex-col sm:flex-row items-center justify-between p-3 border border-neutral-200 rounded-lg bg-neutral-50 gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-neutral-400" />
                    <div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                        {req.category === 'Design' ? 'Design Drawing' : 'In General'}
                      </p>
                      <p className="text-sm font-medium text-neutral-900">{req.pdfFileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors text-center">
                      Tinjau
                    </button>
                    <a href={req.pdfDataUrl} download={req.pdfFileName} className="flex-1 sm:flex-none px-4 py-2 text-xs font-medium text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-md transition-colors text-center">
                      Unduh
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                  <button onClick={() => setRejectingReq(req)} className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors text-center">
                    Tolak Dokumen
                  </button>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => setFullScreenPreviewRequest(req)} className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors text-center">
                      Tinjau Dokumen
                    </button>
                    <button onClick={() => handleOneClickSign(req)} disabled={isSigning || !currentUser.signatureBase64} className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2">
                      {isSigning ? (
                        <><div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" /><span>Memproses...</span></>
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

      {rejectingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Tolak Dokumen</h3>
            <p className="text-sm text-neutral-500 mb-4">Berikan alasan penolakan agar pengaju dapat melakukan perbaikan yang sesuai.</p>
            <textarea 
              value={rejectReason} 
              onChange={e => setRejectReason(e.target.value)} 
              placeholder="Alasan penolakan..." 
              rows={4} 
              className="w-full p-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 mb-4 resize-none" 
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectingReq(null)} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors">
                Batal
              </button>
              <button onClick={handleConfirmReject} className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">
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
