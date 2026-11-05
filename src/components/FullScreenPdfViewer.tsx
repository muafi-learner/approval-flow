import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import { SignatureModal } from './SignatureModal';
import { 
  X, FileDown, AlertTriangle, RefreshCw, DownloadCloud, MessageSquare, Check 
} from 'lucide-react';

export const FullScreenPdfViewer: React.FC<{request: ApprovalRequest; onClose: () => void}> = ({ request, onClose }) => {
  const { currentUser, addAuditNote, performAutoSignApproval, requestRevision, showToast } = useApp();
  const [activeDocType, setActiveDocType] = useState<'WO' | 'PR' | 'PO'>('WO');
  const [activeUrl, setActiveUrl] = useState<string>(request.pdfDataUrl);
  
  const [blobUrl, setBlobUrl] = useState('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadError, setDownloadError] = useState<boolean>(false);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);
  const [isMobileWebView, setIsMobileWebView] = useState(false);
  
  const [selectedNotePage, setSelectedNotePage] = useState<number>(1);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [showForceSignatureModal, setShowForceSignatureModal] = useState(false);
  
  const [showMobileNotes, setShowMobileNotes] = useState(false);

  // Deteksi Mobile Browser
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileWebView(window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (request.category === 'WO Existing') {
      const step = request.currentStepIndex;
      if (step >= 4 && step <= 6 && request.prPdfDataUrl) { setActiveDocType('PR'); setActiveUrl(request.prPdfDataUrl); }
      if (step >= 7 && request.poPdfDataUrl) { setActiveDocType('PO'); setActiveUrl(request.poPdfDataUrl); }
    }
  }, [request]);

  useEffect(() => {
    if (!activeUrl) return;
    let isCancelled = false;
    let objectUrl = '';
    
    const loadBlobWithProgress = () => {
      setDownloadProgress(0);
      setDownloadError(false);
      setBlobUrl('');
      
      if (activeUrl.startsWith('data:')) {
        setDownloadProgress(100);
        setTimeout(() => { if(!isCancelled) setBlobUrl(activeUrl); }, 300);
        return;
      }
      
      const fetchUrl = activeUrl.includes('?') ? `${activeUrl}&t=${Date.now()}` : `${activeUrl}?t=${Date.now()}`;
      const xhr = new XMLHttpRequest();
      xhr.open('GET', fetchUrl);
      xhr.responseType = 'blob';
      
      xhr.onprogress = (e) => {
        if (e.lengthComputable && !isCancelled) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setDownloadProgress(percent);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && !isCancelled) {
          objectUrl = URL.createObjectURL(xhr.response);
          setBlobUrl(objectUrl);
        } else {
          if (!isCancelled) setDownloadError(true);
        }
      };
      
      xhr.onerror = () => {
        if (!isCancelled) setDownloadError(true);
      };
      
      xhr.send();
    };
    
    loadBlobWithProgress();
    
    return () => {
      isCancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeUrl, retryTrigger]);

  const allAuditNotes = [...(request.auditNotes || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const currentStep = request.flow[request.currentStepIndex];
  const isCurrentUserWaiting = request.status === 'in_progress' && currentStep?.userId === currentUser?.id;

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return showToast('Catatan tidak boleh kosong.', 'error');
    addAuditNote(request.id, selectedNotePage, newNoteText, 'approved');
    setNewNoteText('');
  };

  const handleAutoSign = async () => {
    if (!currentUser.signatureBase64) {
      setShowForceSignatureModal(true);
      return;
    }
    setIsSigning(true);
    try {
      const res = await performAutoSignApproval(request.id);
      if (res.success) {
        setShowMobileNotes(false);
        onClose();
      }
    } finally { setIsSigning(false); }
  };

  const handleReturnRevision = () => {
    const noteSummary = allAuditNotes.length > 0 ? allAuditNotes.map(n => `Hal ${n.pageNumber}: ${n.content}`).join('; ') : 'Revisi diperlukan.';
    requestRevision(request.id, request.pageReviews || [], noteSummary);
    setShowMobileNotes(false);
    onClose();
  };

  // Trik Google Docs Viewer untuk me-render PDF dari URL publik di browser Mobile
  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(activeUrl)}&embedded=true`;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-neutral-100 flex flex-col animate-in fade-in duration-150">
        
        {/* HEADER VIEWER */}
        <header className="h-14 px-4 sm:px-6 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto hide-scrollbar">
            <button onClick={() => {setActiveDocType('WO'); setActiveUrl(request.pdfDataUrl);}} className={`whitespace-nowrap text-xs font-medium transition-colors ${activeDocType === 'WO' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
              {request.category === 'Design' ? 'Design Drawing' : 'WO Existing'}
            </button>
            {request.prPdfDataUrl && (
              <button onClick={() => {setActiveDocType('PR'); setActiveUrl(request.prPdfDataUrl!);}} className={`whitespace-nowrap text-xs font-medium transition-colors ${activeDocType === 'PR' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
                Purch. Request
              </button>
            )}
            {request.poPdfDataUrl && (
              <button onClick={() => {setActiveDocType('PO'); setActiveUrl(request.poPdfDataUrl!);}} className={`whitespace-nowrap text-xs font-medium transition-colors ${activeDocType === 'PO' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
                Purch. Order
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 shrink-0 ml-2">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
          
          {/* AREA PDF VIEWER */}
          <main className="flex-1 bg-neutral-200/60 relative p-0 pb-[72px] md:pb-0">
            {blobUrl ? (
              // Jika terdeteksi dibuka di Mobile Browser, paksa lewat GDocs Viewer agar tidak terblokir jadi abu-abu
              isMobileWebView && !activeUrl.startsWith('data:') ? (
                <iframe src={googleDocsViewerUrl} className="w-full h-full border-none bg-white block animate-in fade-in" title="PDF Viewer" />
              ) : (
                <iframe src={`${blobUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none bg-white block animate-in fade-in" title="PDF Viewer" />
              )
            ) : downloadError ? (
              <div className="flex flex-col h-full items-center justify-center bg-white animate-in zoom-in-95 duration-200 p-6">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-5 border border-rose-100">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2 text-center">Koneksi Terputus Saat Memuat Dokumen</h3>
                <p className="text-sm text-neutral-600 max-w-md text-center mb-8 leading-relaxed">
                  Dokumen ini berukuran cukup besar. Proses pratinjau terhenti karena jaringan tidak stabil.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mb-6">
                  <button onClick={() => setRetryTrigger(prev => prev + 1)} className="flex-1 py-3 bg-[#0B1A28] hover:bg-[#152D40] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Coba Muat Ulang
                  </button>
                  <a href={activeUrl} download target="_blank" rel="noreferrer" className="flex-1 py-3 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <DownloadCloud className="w-4 h-4" /> Unduh Langsung
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center bg-white animate-in fade-in duration-300">
                <FileDown className="w-14 h-14 text-neutral-300 mb-6" strokeWidth={1.5} />
                <h2 className="text-xl font-bold text-neutral-900 mb-5 tracking-tight">Mengunduh Dokumen...</h2>
                <div className="w-64 bg-neutral-100 rounded-full h-2.5 overflow-hidden mb-4">
                  <div className="bg-[#0B1A28] h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${downloadProgress}%` }} />
                </div>
                <div className="text-sm font-semibold text-neutral-500">{downloadProgress}%</div>
              </div>
            )}
          </main>

          {/* AREA SIDEBAR / BOTTOM SHEET (MOBILE RESPONSIVE) */}
          <aside 
            className={`bg-white flex flex-col shrink-0 z-40 transition-all duration-300 
              ${showMobileNotes 
                ? 'fixed inset-x-0 bottom-0 top-14 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]' 
                : 'hidden md:flex md:w-80 md:border-l md:border-neutral-100'}
            `}
          >
            <div className="pt-6 px-6 pb-4 flex items-center justify-between border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Catatan Dokumen</h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-medium text-neutral-400">{allAuditNotes.length} Catatan</span>
                <button onClick={() => setShowMobileNotes(false)} className="md:hidden p-1.5 bg-neutral-100 text-neutral-600 rounded-full hover:bg-neutral-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-neutral-100 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-neutral-800">Tambah Catatan</label>
                  <select value={selectedNotePage} onChange={e => setSelectedNotePage(Number(e.target.value))} className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-1 rounded cursor-pointer border-none focus:ring-0">
                    {Array.from({length: request.totalPages || 1}, (_, i) => (<option key={i+1} value={i+1}>Hal {i+1}</option>))}
                  </select>
                </div>
                <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Tulis instruksi atau revisi di sini..." rows={3} className="w-full p-3 text-xs bg-neutral-50/50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B1A28] transition-all resize-none text-neutral-900 placeholder:text-neutral-400" />
                <div className="flex justify-end mt-3">
                  <button onClick={handleSaveNote} disabled={!newNoteText.trim()} className="px-4 py-2 text-[10px] font-bold bg-[#0B1A28] hover:bg-[#152D40] text-white rounded-lg disabled:opacity-30 transition-colors">Kirim</button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {allAuditNotes.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">Belum ada catatan.</p>
                ) : (
                  allAuditNotes.map(n => (
                    <div key={n.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-neutral-900">{n.authorName}</span>
                          <span className="text-[9px] font-bold text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">Hal {n.pageNumber}</span>
                        </div>
                        <span className="text-[9px] font-medium text-neutral-400">{new Date(n.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {isCurrentUserWaiting && (
              <div className="p-6 border-t border-neutral-100 bg-white space-y-3 shrink-0">
                <button onClick={handleAutoSign} disabled={isSigning} className="w-full py-3 text-sm font-semibold text-white bg-[#0B1A28] hover:bg-[#152D40] disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSigning ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : null}
                  <span>Setujui Dokumen</span>
                </button>
                <button onClick={handleReturnRevision} className="w-full py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-colors flex items-center justify-center shadow-sm">
                  Minta Perbaikan Pengaju
                </button>
              </div>
            )}
          </aside>

        </div>

        {/* BOTTOM ACTION BAR RATA (FLAT) - Hanya Tampil di Mobile saat Sidebar Tertutup */}
        {!showMobileNotes && (
          <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 p-4 z-30 flex items-center justify-center">
            <button 
              onClick={() => setShowMobileNotes(true)}
              className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0B1A28] text-white rounded-xl shadow-sm font-semibold text-sm transition-colors active:bg-[#152D40] relative"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Lihat Catatan ({allAuditNotes.length})</span>
              {isCurrentUserWaiting && (
                <span className="flex w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-0 right-0 -mt-1 -mr-1 animate-pulse border-2 border-white" />
              )}
            </button>
          </div>
        )}

      </div>
      
      {showForceSignatureModal && <SignatureModal isOpen={showForceSignatureModal} onClose={() => setShowForceSignatureModal(false)} />}
    </>
  );
};