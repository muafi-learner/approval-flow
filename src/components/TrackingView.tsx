import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest, ApproverStep } from '../types';
import {
  CheckCircle2,
  Clock,
  CircleDashed,
  XCircle,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  X,
  ExternalLink,
  RotateCcw,
  Maximize2
} from 'lucide-react';

export const TrackingView: React.FC = () => {
  const {
    requests,
    selectedRequestForDetail,
    setSelectedRequestForDetail,
    submitRevisionByRequester,
    currentUser,
    showToast,
    setActiveTab,
    setFullScreenPreviewRequest,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'in_progress' | 'needs_revision' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Requester submit revision modal state
  const [submittingRevisionReq, setSubmittingRevisionReq] = useState<ApprovalRequest | null>(null);
  const [requesterNote, setRequesterNote] = useState('');
  const [newPdfFile, setNewPdfFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strictly only the requester can track their submitted requests!
  const myRequests = requests.filter(req => {
    return (
      req.requesterId === currentUser?.id ||
      req.requesterName.toLowerCase() === currentUser?.name.toLowerCase()
    );
  });

  const filteredRequests = myRequests.filter(req => {
    if (filter !== 'all' && req.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStepIcon = (status: ApproverStep['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-amber-600 animate-pulse" />;
      case 'needs_revision':
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <CircleDashed className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getStepBadge = (step: ApproverStep) => {
    switch (step.status) {
      case 'approved':
        return <span className="text-[10px] text-emerald-700 font-medium">Disetujui</span>;
      case 'waiting':
        return <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded">Menunggu {step.userName}</span>;
      case 'needs_revision':
        return <span className="text-[10px] text-orange-700 font-semibold bg-orange-50 px-1 rounded">Revisi ({step.userName})</span>;
      case 'rejected':
        return <span className="text-[10px] text-rose-700 font-medium">Ditolak</span>;
      default:
        return <span className="text-[10px] text-neutral-400">Menunggu</span>;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showToast('Format berkas harus PDF (.pdf)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const dataUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      setNewPdfFile({
        name: file.name,
        dataUrl,
      });
      showToast(`Berkas revisi "${file.name}" siap diunggah.`, 'info');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmSubmitRevision = async () => {
    if (!submittingRevisionReq) return;
    if (!requesterNote.trim()) {
      showToast('Harap tuliskan catatan penjelasan perbaikan!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRevisionByRequester(
        submittingRevisionReq.id,
        requesterNote.trim(),
        newPdfFile?.dataUrl,
        newPdfFile?.name
      );
      setSubmittingRevisionReq(null);
      setRequesterNote('');
      setNewPdfFile(null);
    } catch (e: any) {
      showToast(e?.message || 'Gagal mengirim revisi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const needsRevisionCount = myRequests.filter(r => r.status === 'needs_revision').length;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Status Surat Saya
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-full border border-neutral-200/60">
              {myRequests.length} pengajuan
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Pelacakan status dokumen dan progres pengesahan yang telah Anda kirimkan.
          </p>
        </div>

        {/* Filter Segment Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl shrink-0 border border-neutral-200/60">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Semua ({myRequests.length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              filter === 'in_progress'
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Berjalan
          </button>
          <button
            onClick={() => setFilter('needs_revision')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'needs_revision'
                ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Revisi</span>
            {needsRevisionCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === 'needs_revision' ? 'bg-amber-700 text-white' : 'bg-amber-200/70 text-amber-900'
              }`}>
                {needsRevisionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              filter === 'completed'
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {myRequests.length > 0 && (
        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nomor atau judul dokumen..."
            className="w-full sm:max-w-sm px-3.5 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-400 font-medium"
          />
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-12 sm:p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-neutral-500" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900">
            {myRequests.length === 0 ? 'Belum Ada Pengajuan Surat' : 'Dokumen Tidak Ditemukan'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {myRequests.length === 0
              ? 'Hanya pembuat surat yang dapat melihat riwayat pada menu ini. Mulai dengan membuat pengajuan baru.'
              : 'Tidak ditemukan dokumen yang cocok dengan filter atau kata kunci Anda.'}
          </p>
          {myRequests.length === 0 && (
            <div className="mt-5">
              <button
                onClick={() => setActiveTab('pengajuan')}
                className="px-4 py-2 text-xs sm:text-sm font-semibold bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Ajukan Surat Baru</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map(req => {
            const currentApprover = req.flow[req.currentStepIndex];
            const isCompleted = req.status === 'completed';
            const isNeedsRevision = req.status === 'needs_revision';
            const pagesWithRevision = (req.pageReviews || []).filter(p => p.status === 'needs_revision');

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all shadow-xs ${
                  isNeedsRevision
                    ? 'border-amber-300 ring-1 ring-amber-200/50'
                    : 'border-neutral-200/90 hover:border-neutral-300'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mb-1">
                      <span className="font-mono text-neutral-700 font-semibold bg-neutral-100 px-2 py-0.5 rounded">
                        {req.id}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {new Date(req.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span>
                        Pengaju: <strong className="text-neutral-700 font-medium">{req.requesterName}</strong>
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
                      {req.title}
                    </h2>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-full">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Selesai
                      </span>
                    ) : isNeedsRevision ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300/70 rounded-full">
                        <RotateCcw className="w-4 h-4 text-amber-600" />
                        Perlu Perbaikan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Menunggu: {currentApprover?.userName || 'Pejabat'} ({currentApprover?.roleTitle || 'Approver'})
                      </span>
                    )}
                  </div>
                </div>

                {/* SPECIAL ALERT BOX IF STATUS IS NEEDS_REVISION */}
                {isNeedsRevision && (
                  <div className="my-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-950">
                          <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Dokumen Dikembalikan oleh {req.lastRevisionRequestedBy || currentApprover?.userName} untuk Perbaikan
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-amber-800 font-medium">
                          {req.notes || 'Terdapat lembar halaman yang memerlukan koreksi.'}
                        </p>

                        {/* Detailed Page Notes */}
                        {pagesWithRevision.length > 0 && (
                          <div className="mt-2.5 space-y-1.5">
                            {pagesWithRevision.map(p => (
                              <div
                                key={p.pageNumber}
                                className="p-2.5 bg-white border border-amber-200/60 rounded-lg text-xs"
                              >
                                <strong className="font-semibold text-amber-950">
                                  Halaman {p.pageNumber} ({p.title}):
                                </strong>{' '}
                                <span className="text-amber-800 italic">
                                  "{p.note || 'Perlu penyesuaian'}"
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Requester Action Button to Submit Revision */}
                      <button
                        onClick={() => {
                          setSubmittingRevisionReq(req);
                          setRequesterNote('');
                          setNewPdfFile(null);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kirim Perbaikan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Section: Tracking Approval Status Pipeline */}
                <div className="py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {req.flow.map((step, idx) => {
                      const isWaiting = step.status === 'waiting';
                      const isApproved = step.status === 'approved';
                      const isStepNeedsRevision = step.status === 'needs_revision';

                      return (
                        <div
                          key={step.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isWaiting
                              ? 'bg-amber-50/60 border-amber-300'
                              : isStepNeedsRevision
                              ? 'bg-orange-50/60 border-orange-300'
                              : isApproved
                              ? 'bg-emerald-50/60 border-emerald-200/80'
                              : 'bg-neutral-50/60 border-neutral-200/60 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-mono text-neutral-500 font-medium">
                              Tahap {idx + 1}
                            </span>
                            {getStepIcon(step.status)}
                          </div>

                          <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                            {step.userName}
                          </div>
                          <div className="text-[11px] text-neutral-500 truncate mb-2">
                            {step.roleTitle}
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/50">
                            {getStepBadge(step)}
                            {step.signedAt && (
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {new Date(step.signedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="truncate max-w-sm font-medium text-neutral-700">{req.pdfFileName}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isNeedsRevision && (
                      <button
                        onClick={() => {
                          setSubmittingRevisionReq(req);
                          setRequesterNote('');
                          setNewPdfFile(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Kirim Perbaikan</span>
                      </button>
                    )}

                    <button
                      onClick={() => setFullScreenPreviewRequest(req)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Buka Surat</span>
                    </button>

                    <a
                      href={req.pdfDataUrl}
                      download={`Signed_${req.pdfFileName}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REQUESTER SUBMIT REVISION */}
      {submittingRevisionReq && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <span className="text-xs font-mono text-neutral-500">
                  {submittingRevisionReq.id}
                </span>
                <h3 className="text-base font-bold text-neutral-900">
                  Kirim Dokumen Revisi ke Approver
                </h3>
              </div>
              <button
                onClick={() => setSubmittingRevisionReq(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Approver's Page Revision Notes */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                <div className="font-bold text-amber-900 mb-1">
                  Catatan Revisi dari {submittingRevisionReq.lastRevisionRequestedBy || 'Approver'}:
                </div>
                <div className="space-y-1 text-amber-800">
                  {(submittingRevisionReq.pageReviews || [])
                    .filter(p => p.status === 'needs_revision')
                    .map(p => (
                      <div key={p.pageNumber}>
                        • <strong>Halaman {p.pageNumber}:</strong> {p.note || 'Perlu diperbaiki'}
                      </div>
                    ))}
                </div>
              </div>

              {/* Form Input: Requester Explanation Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Catatan Penjelasan Perbaikan dari Pengaju (Wajib):
                </label>
                <textarea
                  value={requesterNote}
                  onChange={e => setRequesterNote(e.target.value)}
                  placeholder="Contoh: Sudah disesuaikan palet warna, tipografi, dan aset di Halaman 3 sesuai arahan..."
                  rows={3}
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Optional: Replace PDF file */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Unggah Dokumen PDF Revisi (Opsional):
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 cursor-pointer"
                />
                {newPdfFile ? (
                  <p className="text-[11px] text-emerald-600 mt-1">
                    ✓ File baru dipilih: {newPdfFile.name}
                  </p>
                ) : (
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Jika tidak mengunggah file baru, dokumen yang ada akan diteruskan kembali beserta catatan perbaikan.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSubmittingRevisionReq(null)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitRevision}
                disabled={isSubmitting || !requesterNote.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Kembali ke Approver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL / DRAWER */}
      {selectedRequestForDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-neutral-500">
                  {selectedRequestForDetail.id}
                </span>
                <h3 className="text-base font-bold text-neutral-900">
                  {selectedRequestForDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequestForDetail(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Banner */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="text-xs font-semibold text-neutral-500 mb-2">
                  Status Alur Saat Ini:
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {selectedRequestForDetail.flow.map((s, i) => (
                    <React.Fragment key={s.id}>
                      <span
                        className={`px-2.5 py-1 rounded-md font-medium border ${
                          s.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : s.status === 'waiting'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : s.status === 'needs_revision'
                            ? 'bg-orange-100 text-orange-900 border-orange-300 font-bold'
                            : 'bg-white text-neutral-600 border-neutral-200'
                        }`}
                      >
                        {s.userName} ({s.roleTitle})
                        {s.status === 'waiting' && ' [Waiting]'}
                        {s.status === 'needs_revision' && ' [Perlu Revisi]'}
                      </span>
                      {i < selectedRequestForDetail.flow.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Per-Page Status Overview */}
              {selectedRequestForDetail.pageReviews && (
                <div>
                  <h4 className="text-xs font-semibold text-neutral-700 uppercase mb-2">
                    Status & Catatan Lembar Halaman (Review Per Halaman)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedRequestForDetail.pageReviews.map(p => (
                      <div
                        key={p.pageNumber}
                        className={`p-3 rounded-xl border ${
                          p.status === 'needs_revision'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="font-semibold">
                            Halaman {p.pageNumber}
                          </strong>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              p.status === 'needs_revision'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {p.status === 'needs_revision' ? 'Perlu Revisi' : 'Disetujui'}
                          </span>
                        </div>
                        {p.note ? (
                          <p className="text-[11px] italic mt-1 text-neutral-800">
                            "{p.note}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Tidak ada catatan perbaikan.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Preview Frame */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-neutral-700 uppercase">
                    Preview Dokumen PDF Terkini
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFullScreenPreviewRequest(selectedRequestForDetail);
                        setSelectedRequestForDetail(null);
                      }}
                      className="text-xs text-white bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Buka Layar Penuh</span>
                    </button>
                    <a
                      href={selectedRequestForDetail.pdfDataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-neutral-600 hover:text-neutral-900 flex items-center gap-1 underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Tab Baru</span>
                    </a>
                  </div>
                </div>

                <div className="w-full h-96 border border-neutral-300 rounded-xl overflow-hidden bg-neutral-100">
                  <iframe
                    src={selectedRequestForDetail.pdfDataUrl}
                    title="PDF Preview"
                    className="w-full h-full border-0"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Tanda tangan otomatis disematkan secara pas di dalam kotakan (contain) tanpa menumpuk teks maupun garis tabel pada lembar yang ditentukan.
                </p>
              </div>

              {/* Digital Signature Audit Trail */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-700 uppercase mb-3">
                  Audit Trail Tanda Tangan Digital
                </h4>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl overflow-hidden">
                  {selectedRequestForDetail.flow.map(step => {
                    const multiPageCount = step.detectedSlots && step.detectedSlots.length > 1 ? step.detectedSlots.length : 1;
                    return (
                      <div
                        key={step.id}
                        className="p-3.5 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-700">
                            {step.userName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-neutral-900">
                                {step.userName} — {step.roleTitle}
                              </span>
                              {multiPageCount > 1 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-neutral-100 text-neutral-700 rounded border border-neutral-200">
                                  {multiPageCount} Halaman
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {step.status === 'approved'
                                ? `Ditandatangani pada: ${new Date(step.signedAt || '').toLocaleString('id-ID')}`
                                : step.status === 'waiting'
                                ? 'Sedang menunggu tanda tangan'
                                : step.status === 'needs_revision'
                                ? 'Meminta revisi lembar dokumen'
                                : 'Menunggu giliran'}
                            </div>
                          </div>
                        </div>

                        <div>
                          {step.signatureUrl ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={step.signatureUrl}
                                alt="TTD"
                                className="h-7 w-16 object-contain bg-neutral-50 border border-neutral-200 rounded px-1"
                              />
                              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                                Terverifikasi Kotakan
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-400 text-xs">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2">
              <a
                href={selectedRequestForDetail.pdfDataUrl}
                download={`Signed_${selectedRequestForDetail.pdfFileName}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Dokumen Resmi</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
