import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ApprovalRequest } from '../types';
import { SignatureModal } from './SignatureModal';
import { X, RotateCcw, Check } from 'lucide-react';

export const FullScreenPdfViewer: React.FC<{request: ApprovalRequest; onClose: () => void}> = ({ request, onClose }) => {
  const { currentUser, addAuditNote, performAutoSignApproval, requestRevision, showToast } = useApp();
  const [activeDocType, setActiveDocType] = useState<'WO' | 'PR' | 'PO'>('WO');
  const [activeUrl, setActiveUrl] = useState<string>(request.pdfDataUrl);
  const [blobUrl, setBlobUrl] = useState('');
  const [selectedNotePage, setSelectedNotePage] = useState<number>(1);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [showForceSignatureModal, setShowForceSignatureModal] = useState(false);

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

    const loadBlobAsync = async () => {
      try {
        if (activeUrl.startsWith('data:')) {
          const res = await fetch(activeUrl);
          const blob = await res.blob();
          if (!isCancelled) {
            objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
          }
        } else {
          if (!isCancelled) setBlobUrl(activeUrl);
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
  }, [activeUrl]);

  const allAuditNotes = [...(request.auditNotes || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const currentStep = request.flow[request.currentStepIndex];
  const isCurrentUserWaiting = request.status === 'in_progress' && currentStep?.userId === currentUser?.id;

  const handleSaveNote = () => {
    if (!newNoteText.trim()) return showToast('Catatan tidak boleh kosong.', 'error');
    addAuditNote(request.id, selectedNotePage, newNoteText, 'approved');
    setNewNoteText('');
  };

  const handleAutoSign = async () => {
    if (!currentUser.signatureBase64) return setShowForceSignatureModal(true);
    setIsSigning(true);
    try {
      const res = await performAutoSignApproval(request.id);
      if (res.success) onClose();
    } finally { setIsSigning(false); }
  };

  const handleReturnRevision = () => {
    const noteSummary = allAuditNotes.length > 0 ? allAuditNotes.map(n => `Hal ${n.pageNumber}: ${n.content}`).join('; ') : 'Revisi diperlukan.';
    requestRevision(request.id, request.pageReviews || [], noteSummary);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-neutral-100 flex flex-col animate-in fade-in duration-150">
        <header className="h-14 px-6 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-5">
            <button onClick={() => {setActiveDocType('WO'); setActiveUrl(request.pdfDataUrl);}} className={`text-xs font-medium transition-colors ${activeDocType === 'WO' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
              {request.category === 'Design' ? 'Design Drawing' : 'WO Existing'}
            </button>
            {request.prPdfDataUrl && (
              <button onClick={() => {setActiveDocType('PR'); setActiveUrl(request.prPdfDataUrl!);}} className={`text-xs font-medium transition-colors ${activeDocType === 'PR' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
                Purch. Request
              </button>
            )}
            {request.poPdfDataUrl && (
              <button onClick={() => {setActiveDocType('PO'); setActiveUrl(request.poPdfDataUrl!);}} className={`text-xs font-medium transition-colors ${activeDocType === 'PO' ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-900'}`}>
                Purch. Order
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 bg-neutral-200/60 relative p-0">
            {blobUrl ? (
              <iframe src={`${blobUrl}#toolbar=0&navpanes=0`} className="w-full h-full border-none bg-white block" title="PDF Viewer" />
            ) : (
              <div className="flex h-full items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin" /></div>
            )}
          </main>

          <aside className="w-80 bg-white border-l border-neutral-100 flex flex-col shrink-0 z-10">
            <div className="pt-6 px-6 pb-4 flex items-center justify-between border-b border-neutral-100">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">Catatan Dokumen</h3>
              <span className="text-[10px] font-medium text-neutral-400">{allAuditNotes.length} Catatan</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-neutral-100 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-neutral-800">Tambah Catatan</label>
                  <select value={selectedNotePage} onChange={e => setSelectedNotePage(Number(e.target.value))} className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-1 rounded cursor-pointer border-none focus:ring-0">
                    {Array.from({length: request.totalPages || 1}, (_, i) => (<option key={i+1} value={i+1}>Hal {i+1}</option>))}
                  </select>
                </div>
                <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Tulis instruksi atau revisi di sini..." rows={3} className="w-full p-3 text-xs bg-neutral-50/50 border border-neutral-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-200 transition-all resize-none text-neutral-900 placeholder:text-neutral-400" />
                <div className="flex justify-end mt-3">
                  <button onClick={handleSaveNote} disabled={!newNoteText.trim()} className="px-4 py-2 text-[10px] font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg disabled:opacity-30 transition-colors">Kirim</button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {allAuditNotes.map(n => (
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
                ))}
              </div>
            </div>
            {isCurrentUserWaiting && (
              <div className="p-6 border-t border-neutral-100 bg-white space-y-3">
                <button onClick={handleAutoSign} disabled={isSigning} className="w-full py-3 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                  {isSigning ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}<span>Setujui Dokumen</span>
                </button>
                <button onClick={handleReturnRevision} className="w-full py-2.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <RotateCcw className="w-4 h-4" /> Minta Perbaikan Pengaju
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>
      {showForceSignatureModal && <SignatureModal isOpen={showForceSignatureModal} onClose={() => setShowForceSignatureModal(false)} />}
    </>
  );
};