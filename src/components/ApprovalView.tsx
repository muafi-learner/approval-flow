import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest, PageReviewItem } from '../types';
import {
  Inbox,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  Check,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Layers,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';

export const ApprovalView: React.FC = () => {
  const {
    requests,
    currentUser,
    performAutoSignApproval,
    requestRevision,
    rejectRequest,
    setActiveTab,
    users,
    setCurrentUser,
    showToast,
    setFullScreenPreviewRequest,
    addAuditNote,
  } = useApp();

  const [signingId, setSigningId] = useState<string | null>(null);
  const [rejectingReq, setRejectingReq] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Page review state per request: { [requestId]: { [pageNumber]: { status: 'approved' | 'needs_revision', note: string } } }
  const [reviewState, setReviewState] = useState<
    Record<string, Record<number, { status: 'approved' | 'needs_revision'; note: string }>>
  >({});

  // Expanded inspection drawer for each request
  const [expandedReviewIds, setExpandedReviewIds] = useState<Record<string, boolean>>({});

  // Find requests waiting for the current logged-in user
  const incomingRequests = requests.filter(r => {
    if (r.status !== 'in_progress') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  });

  // Requests that were returned to requester and are currently awaiting requester's revision
  const waitingRevisionRequests = requests.filter(r => {
    if (r.status !== 'needs_revision') return false;
    const currentStep = r.flow[r.currentStepIndex];
    return currentStep && currentStep.userId === currentUser.id;
  });

  const getPageData = (
    reqId: string,
    pageNum: number,
    req?: ApprovalRequest
  ): { status: 'approved' | 'needs_revision'; note: string } => {
    if (reviewState[reqId]?.[pageNum]) {
      return reviewState[reqId][pageNum];
    }
    // Fallback to request's stored pageReviews if exists
    if (req?.pageReviews) {
      const stored = req.pageReviews.find(p => p.pageNumber === pageNum);
      if (stored) {
        return { status: stored.status, note: stored.note || '' };
      }
    }
    return { status: 'approved', note: '' };
  };

  const setPageStatus = (
    reqId: string,
    pageNum: number,
    status: 'approved' | 'needs_revision'
  ) => {
    setReviewState(prev => {
      const currentReq = prev[reqId] || {};
      const currentPage = currentReq[pageNum] || { status: 'approved', note: '' };
      return {
        ...prev,
        [reqId]: {
          ...currentReq,
          [pageNum]: {
            ...currentPage,
            status,
          },
        },
      };
    });
  };

  const setPageNote = (reqId: string, pageNum: number, note: string) => {
    setReviewState(prev => {
      const currentReq = prev[reqId] || {};
      const currentPage = currentReq[pageNum] || { status: 'needs_revision', note: '' };
      return {
        ...prev,
        [reqId]: {
          ...currentReq,
          [pageNum]: {
            ...currentPage,
            note,
          },
        },
      };
    });
  };

  const markAllPagesApproved = (reqId: string, totalPages: number = 4) => {
    const freshPages: Record<number, { status: 'approved' | 'needs_revision'; note: string }> = {};
    for (let i = 1; i <= totalPages; i++) {
      freshPages[i] = { status: 'approved', note: '' };
    }
    setReviewState(prev => ({
      ...prev,
      [reqId]: freshPages,
    }));
    showToast('Seluruh lembar halaman ditandai Disetujui.', 'success');
  };

  // Handle One-Click Auto Sign (when all pages are approved)
  const handleOneClickSign = async (req: ApprovalRequest) => {
    if (!currentUser.signatureBase64) {
      showToast('Tanda tangan digital belum tersedia. Silakan buat di menu TTD.', 'error');
      setActiveTab('ttd');
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

  // Handle returning document to requester for page revision
  const handleReturnForRevision = (req: ApprovalRequest) => {
    const totalPages = req.totalPages || 4;
    const pageReviews: PageReviewItem[] = [];
    const notesSummary: string[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const data = getPageData(req.id, p, req);
      const title = req.pageReviews?.find(pr => pr.pageNumber === p)?.title || `Halaman ${p}`;
      pageReviews.push({
        pageNumber: p,
        title,
        status: data.status,
        note: data.note,
      });

      if (data.status === 'needs_revision') {
        const noteText = data.note ? `: "${data.note}"` : '';
        notesSummary.push(`Hal ${p}${noteText}`);
      }
    }

    const generalNote = notesSummary.length > 0
      ? `Revisi diperlukan pada ${notesSummary.join('; ')}`
      : 'Perlu revisi pada lembar dokumen.';

    requestRevision(req.id, pageReviews, generalNote);
  };

  const handleConfirmReject = () => {
    if (!rejectingReq) return;
    rejectRequest(rejectingReq.id, rejectReason || 'Ditolak oleh approver');
    setRejectingReq(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Persetujuan Dokumen
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-neutral-900 text-white rounded-full">
              {incomingRequests.length} menunggu
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Daftar berkas yang membutuhkan verifikasi dan otorisasi dari <span className="font-semibold text-neutral-800">{currentUser.name}</span> ({currentUser.role}).
          </p>
        </div>
      </div>

      {/* Signature Readiness Alert if missing */}
      {!currentUser.signatureBase64 && (
        <div className="mb-6 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between transition-all">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900 font-medium">
              <span className="font-semibold">Tanda tangan digital belum aktif.</span> Buat tanda tangan Anda di tab TTD agar pengesahan dapat diproses instan.
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ttd')}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Atur TTD
          </button>
        </div>
      )}

      {/* Notice for requests currently returned to Requester for revision */}
      {waitingRevisionRequests.length > 0 && (
        <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-700">
              <span className="font-semibold text-neutral-900">
                {waitingRevisionRequests.length} dokumen sedang diperbaiki oleh pengaju:
              </span>
              <ul className="mt-1 space-y-0.5 text-neutral-600 list-disc list-inside">
                {waitingRevisionRequests.map(r => (
                  <li key={r.id}>
                    <span className="font-medium text-neutral-800">{r.title}</span> — menunggu respons dari {r.requesterName}.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Content / Empty State */}
      {incomingRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 sm:p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-neutral-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
            Semua Dokumen Selesai
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            Tidak ada dokumen yang sedang menunggu tanda tangan Anda saat ini.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('tracking')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Cek Status Surat
            </button>
            <button
              onClick={() => setActiveTab('pengajuan')}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-colors cursor-pointer"
            >
              Ajukan Surat Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {incomingRequests.map(req => {
            const currentStep = req.flow[req.currentStepIndex];
            const isSigning = signingId === req.id;
            const totalPages = req.totalPages || 4;

            // Check if requester has resolved previous revision
            const latestHistory = req.revisionHistory && req.revisionHistory.length > 0
              ? req.revisionHistory[req.revisionHistory.length - 1]
              : null;
            const hasRecentRequesterResponse = latestHistory && latestHistory.resolvedAt;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 hover:border-neutral-300 transition-all shadow-xs"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-1.5">
                      <span className="font-mono text-neutral-700 font-semibold bg-neutral-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-neutral-600">
                        Diajukan oleh <strong className="font-semibold text-neutral-800">{req.requesterName}</strong>
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Tahap {req.currentStepIndex + 1} dari {req.flow.length}: {currentStep.roleTitle}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                      {req.title}
                    </h3>

                    {req.notes && (
                      <p className="text-xs text-neutral-500 mt-1 italic">
                        "{req.notes}"
                      </p>
                    )}
                  </div>

                  {/* Signature Status Pill */}
                  <div className="shrink-0 flex items-center gap-2.5 px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200/70">
                    {currentUser.signatureBase64 ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={currentUser.signatureBase64}
                          alt="Signature Preview"
                          className="h-6 w-16 object-contain bg-white rounded border border-neutral-200/60 px-1"
                        />
                        <span className="text-[11px] font-semibold text-emerald-700">
                          TTD Siap
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Belum ada TTD
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner if Requester submitted revision response */}
                {hasRecentRequesterResponse && (
                  <div className="my-4 p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl flex items-start gap-2.5 text-xs text-sky-900">
                    <CheckCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Revisi telah diperbarui oleh {latestHistory.resolvedByRequesterName}:</span>
                      <p className="mt-0.5 text-sky-800 italic">
                        "{latestHistory.requesterResponseNote || 'Dokumen telah disesuaikan'}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Document Card & Actions (Less Friction, Seamless) */}
                <div className="mt-2 p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-900 truncate">
                          {req.pdfFileName}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {totalPages} Halaman PDF
                        </div>
                      </div>
                    </div>

                    <a
                      href={req.pdfDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors w-fit"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Tab Baru</span>
                    </a>
                  </div>

                  {/* Primary Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-neutral-200/60">
                    <button
                      type="button"
                      onClick={() => setFullScreenPreviewRequest(req)}
                      className="py-2.5 px-4 bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Maximize2 className="w-4 h-4 text-neutral-700" />
                      <span>Tinjau & Periksa Halaman</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOneClickSign(req)}
                      disabled={isSigning || !currentUser.signatureBase64}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSigning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Menandatangani...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Tanda Tangani Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub-actions: Revision / Reject */}
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                  <span>Perlu penyesuaian isi dokumen?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFullScreenPreviewRequest(req)}
                      className="font-medium text-amber-800 hover:text-amber-950 px-2 py-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      Beri Catatan Revisi
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setRejectingReq(req)}
                      className="font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject & Return to User A Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                !
              </span>
              <h3 className="text-base font-bold text-neutral-900">
                Tolak & Kembalikan ke {rejectingReq.requesterName} (User A)
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Sesuai alur, dokumen ini akan dikembalikan ke {rejectingReq.requesterName} (User A) untuk direvisi, lalu diajukan ulang ke Anda setelah diperbaiki.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Tuliskan catatan perbaikan atau alasan penolakan untuk User A..."
              rows={3}
              className="mt-4 w-full p-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-900 font-medium"
            />

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors cursor-pointer"
              >
                Tolak & Minta Revisi User A
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
