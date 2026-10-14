import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest, PageAuditNote } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Clock,
  User,
  ShieldCheck,
  RotateCcw,
  Download,
  Tag,
  Check,
  Eye,
  Layers,
  FileText
} from 'lucide-react';

// Initialize PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  // worker fallback
}

interface FullScreenPdfViewerProps {
  request: ApprovalRequest;
  onClose: () => void;
}

export const FullScreenPdfViewer: React.FC<FullScreenPdfViewerProps> = ({
  request,
  onClose,
}) => {
  const {
    currentUser,
    addAuditNote,
    performAutoSignApproval,
    requestRevision,
    showToast,
  } = useApp();

  const [activePage, setActivePage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(request.totalPages || 4);
  const [zoom, setZoom] = useState<number>(1.2);
  const [showSignatureOverlay, setShowSignatureOverlay] = useState<boolean>(true);
  const [sidebarTab, setSidebarTab] = useState<'current_page' | 'audit_history'>('current_page');
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Quick preset tags for rapid note writing
  const QUICK_TAGS = [
    'Revisi Redaksional',
    'Koreksi Nilai / Data',
    'Perbaikan Format Tabel',
    'Lampiran Belum Lengkap',
    'Validasi Ulang QA',
    'Disetujui Penuh',
  ];

  // Load PDF document using pdfjs
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      try {
        setIsRendering(true);
        setRenderError(null);
        let bytes: Uint8Array;

        if (request.pdfDataUrl.startsWith('data:')) {
          const base64Data = request.pdfDataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
        } else {
          const response = await fetch(request.pdfDataUrl);
          const buffer = await response.arrayBuffer();
          bytes = new Uint8Array(buffer);
        }

        const loadingTask = pdfjsLib.getDocument({
          data: bytes,
          useSystemFonts: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
        }
      } catch (err: any) {
        console.error('Failed to load PDF in FullScreenPdfViewer:', err);
        if (!isCancelled) {
          setRenderError(err?.message || 'Gagal merender dokumen PDF.');
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [request.pdfDataUrl]);

  // Render current active page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPage() {
      try {
        setIsRendering(true);
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // ignore cancel exception
          }
        }

        const page = await pdfDoc.getPage(activePage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [pdfDoc, activePage, zoom]);

  // Audit notes for active page
  const pageAuditNotes = (request.auditNotes || []).filter(
    n => n.pageNumber === activePage
  );

  // All audit notes sorted newest first
  const allAuditNotes = [...(request.auditNotes || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Check if current user is the waiting approver for this request
  const currentStep = request.flow[request.currentStepIndex];
  const isCurrentUserWaitingApprover =
    request.status === 'in_progress' &&
    currentStep &&
    currentStep.userId === currentUser.id;

  // Signature slot for this active page if any
  const mySlotsOnActivePage = (
    currentStep?.detectedSlots ||
    (currentStep?.detectedSlot ? [currentStep.detectedSlot] : [])
  ).filter(s => s.pageNumber === activePage || s.pageIndex === activePage - 1);

  const handleSaveNote = () => {
    if (!newNoteText.trim()) {
      showToast('Tulis isi catatan terlebih dahulu.', 'error');
      return;
    }

    addAuditNote(
      request.id,
      activePage,
      newNoteText,
      'approved',
      selectedTag || undefined
    );

    setNewNoteText('');
    setSelectedTag('');
  };

  const handleAutoSign = async () => {
    setIsSigning(true);
    try {
      const res = await performAutoSignApproval(request.id);
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleReturnRevision = () => {
    const noteSummary =
      allAuditNotes.length > 0
        ? allAuditNotes.map(n => `Hal ${n.pageNumber}: ${n.content}`).join('; ')
        : 'Perlu revisi sesuai catatan pada dokumen.';
    requestRevision(request.id, request.pageReviews || [], `Revisi: ${noteSummary}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-100 text-neutral-900 flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* ================= 1. TOP CONTROL BAR (SLEEK & MINIMALIST) ================= */}
      <header className="h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-xs border-b border-neutral-200 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Left: Document Identity & Back Button */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0 text-xs sm:text-sm font-medium"
            title="Kembali ke Daftar Dokumen"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-600 shrink-0" />
            <span>Kembali</span>
          </button>

          <div className="h-4 w-px bg-neutral-200 shrink-0 hidden sm:block" />

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate max-w-xs sm:max-w-md">
              {request.title}
            </h2>
            <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
              <span className="font-mono text-neutral-500">{request.id}</span>
              <span>·</span>
              <span>{totalPages} Halaman</span>
            </div>
          </div>
        </div>

        {/* Center: Sleek Page Navigation & Zoom */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-neutral-100/90 border border-neutral-200/80 rounded-xl p-1">
          <button
            onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
            disabled={activePage <= 1}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-medium text-xs cursor-pointer transition-colors"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-600" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          <div className="px-2 sm:px-3 text-xs font-medium text-neutral-700 min-w-20 sm:min-w-28 text-center select-none">
            Hal <span className="text-neutral-900 font-bold">{activePage}</span> / {totalPages}
          </div>

          <button
            onClick={() => setActivePage(prev => Math.min(totalPages, prev + 1))}
            disabled={activePage >= totalPages}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent font-medium text-xs cursor-pointer transition-colors"
            title="Halaman Berikutnya"
          >
            <span className="hidden sm:inline">Berikutnya</span>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </button>

          <div className="hidden md:block h-4 w-px bg-neutral-200 mx-1" />

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-0.5">
            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-white cursor-pointer transition-colors"
              title="Perkecil Tampilan (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-medium text-neutral-700 w-12 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={() => setZoom(prev => Math.min(2.4, prev + 0.2))}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-950 hover:bg-white cursor-pointer transition-colors"
              title="Perbesar Tampilan (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoom(1.2)}
              className="px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white rounded-lg cursor-pointer transition-colors"
              title="Reset Ukuran Pas Layar"
            >
              Pas
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <a
            href={request.pdfDataUrl}
            download={request.pdfFileName}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Unduh</span>
          </a>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </header>

      {/* ================= 2. MAIN WORKSPACE ================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: PDF Page Canvas Viewer (Comfortable Paper View on Desk) */}
        <main className="flex-1 bg-neutral-200/90 overflow-auto flex items-center justify-center p-4 sm:p-8 relative">
          {isRendering && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center z-10 text-neutral-800">
              <div className="w-10 h-10 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-sm font-bold">Memuat Halaman {activePage}...</span>
            </div>
          )}

          {renderError ? (
            <div className="max-w-md p-6 bg-white border-2 border-neutral-300 rounded-2xl text-center shadow-lg">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <div className="text-base font-bold text-neutral-900 mb-1">
                Gagal memuat pratinjau canvas PDF
              </div>
              <p className="text-xs text-neutral-600 mb-4">
                {renderError}
              </p>
              <div className="w-full h-80 rounded-xl overflow-hidden border border-neutral-300">
                <iframe
                  src={request.pdfDataUrl}
                  title="PDF Fallback"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-sm transition-transform duration-150 border border-neutral-300 bg-white">
              <canvas
                ref={canvasRef}
                className="block bg-white shadow-2xl max-w-none"
              />

              {/* OVERLAY: Detected Signature Box on this page */}
              {showSignatureOverlay && mySlotsOnActivePage.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {mySlotsOnActivePage.map((slot, sIdx) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return null;
                    const pdfPageHeight = 841.89; // standard A4
                    const pdfPageWidth = 595.28;
                    const scaleX = canvas.width / pdfPageWidth;
                    const scaleY = canvas.height / pdfPageHeight;

                    const overlayLeft = slot.x * scaleX;
                    const overlayTop = (pdfPageHeight - slot.y - slot.height) * scaleY;
                    const overlayWidth = slot.width * scaleX;
                    const overlayHeight = slot.height * scaleY;

                    return (
                      <div
                        key={sIdx}
                        style={{
                          left: `${overlayLeft}px`,
                          top: `${overlayTop}px`,
                          width: `${overlayWidth}px`,
                          height: `${overlayHeight}px`,
                        }}
                        className="absolute border-2 border-dashed border-emerald-600 bg-emerald-500/15 rounded-lg flex items-center justify-center p-1"
                      >
                        <div className="bg-emerald-900 text-white text-[11px] font-black px-2 py-0.5 rounded shadow text-center truncate">
                          Area Tanda Tangan Anda
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right: Notes & Audit Trail Panel */}
        <aside className="w-80 sm:w-92 bg-white border-l border-neutral-200 flex flex-col shrink-0">
          {/* Panel Header Tabs */}
          <div className="p-2.5 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center gap-1">
            <button
              onClick={() => setSidebarTab('current_page')}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                sidebarTab === 'current_page'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Catatan Hal {activePage}
            </button>
            <button
              onClick={() => setSidebarTab('audit_history')}
              className={`flex-1 py-1.5 px-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                sidebarTab === 'audit_history'
                  ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Semua Catatan</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                sidebarTab === 'audit_history' ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700'
              }`}>
                {allAuditNotes.length}
              </span>
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/40">
            {sidebarTab === 'current_page' ? (
              <>

                {/* 2. Direct Note Writing Area */}
                <div className="p-3.5 bg-white border border-neutral-200/80 rounded-xl shadow-2xs space-y-2.5">
                  <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Catatan Halaman {activePage}:</span>
                  </label>

                  <textarea
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder={`Tuliskan koreksi atau catatan untuk Halaman ${activePage}...`}
                    rows={3}
                    className="w-full p-2.5 text-xs bg-neutral-50/70 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white font-medium"
                  />

                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={!newNoteText.trim()}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Simpan Catatan</span>
                  </button>
                </div>

                {/* 3. Recorded Notes on Current Page */}
                <div>
                  <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    Riwayat Catatan Halaman Ini ({pageAuditNotes.length}):
                  </div>

                  {pageAuditNotes.length === 0 ? (
                    <div className="p-4 bg-white border border-neutral-200/80 rounded-xl text-center text-neutral-400 text-xs">
                      Belum ada catatan pada Halaman {activePage}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pageAuditNotes.map(n => (
                        <div
                          key={n.id}
                          className="p-3 bg-white border border-neutral-200/80 rounded-xl space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 font-semibold text-neutral-800">
                              <User className="w-3 h-3 text-neutral-400" />
                              <span>{n.authorName}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-700 leading-relaxed font-normal">
                            "{n.content}"
                          </p>

                          <div className="flex items-center justify-end pt-1">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              n.status === 'needs_revision' ? 'bg-amber-50 text-amber-800 border border-amber-200/60' : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                            }`}>
                              {n.status === 'needs_revision' ? 'Perlu Revisi' : 'Disetujui'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* All Pages Audit History */
              <div className="space-y-2.5">
                <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Seluruh Riwayat Catatan ({allAuditNotes.length}):
                </div>

                {allAuditNotes.length === 0 ? (
                  <div className="p-5 bg-white border border-neutral-200/80 rounded-xl text-center text-neutral-400 text-xs">
                    Belum ada riwayat catatan pada berkas ini.
                  </div>
                ) : (
                  allAuditNotes.map(n => (
                    <div
                      key={n.id}
                      className="p-3 bg-white border border-neutral-200/80 rounded-xl space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePage(n.pageNumber);
                              setSidebarTab('current_page');
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-white cursor-pointer"
                          >
                            Hal {n.pageNumber}
                          </button>
                          <span className="font-semibold text-neutral-800">{n.authorName}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-700 leading-relaxed font-normal">
                        "{n.content}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Panel Footer: Action Buttons */}
          <div className="p-4 bg-white border-t border-neutral-200 space-y-2.5 shrink-0">
            {allAuditNotes.length > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Catatan Tersemat:</span>
                <span className="font-semibold text-neutral-800">
                  {allAuditNotes.length} Catatan
                </span>
              </div>
            )}

            {/* Workflow execution buttons if active approver */}
            {isCurrentUserWaitingApprover && (
              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={handleAutoSign}
                  disabled={isSigning || !currentUser.signatureBase64}
                  className="w-full py-2.5 px-3 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSigning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Menandatangani Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {request.currentStepIndex >= request.flow.length - 1
                          ? 'Setujui & Sahkan Dokumen (Final)'
                          : `Setujui & Teruskan ke ${request.flow[request.currentStepIndex + 1]?.userName || 'Tahap Berikutnya'}`}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReturnRevision}
                  className="w-full py-2 px-3 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Kembalikan ke {request.requesterName} untuk Direvisi</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
