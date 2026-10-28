import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ApprovalRequest, ApproverStep, TabType, PageReviewItem, RevisionHistoryItem, AuditNote } from '../types';
import { executeOneClickAutoSign } from '../services/pdfAutoSigner';
import usersData from '../data/users.json';

interface AppContextType {
  activeTab: TabType; setActiveTab: (tab: TabType) => void;
  users: UserProfile[]; currentUser: UserProfile; setCurrentUser: (user: UserProfile) => void;
  isLoggedIn: boolean; login: (u: string, p: string) => { success: boolean; message?: string }; logout: () => void;
  requests: ApprovalRequest[]; saveSignature: (userId: string, sig: string) => void;
  createNewRequest: (t: string, fn: string, fd: string, a: any[], tp: number, c: 'Design' | 'WO Existing', sp: number[], forceNewPage?: boolean) => Promise<string>;
  performAutoSignApproval: (requestId: string) => Promise<{ success: boolean; message: string }>;
  uploadPRAndForward: (requestId: string, fileName: string, dataUrl: string) => Promise<void>;
  uploadPOAndComplete: (requestId: string, fileName: string, dataUrl: string) => Promise<void>;
  rejectPRToMega: (requestId: string, reason: string) => void;
  requestRevision: (requestId: string, pageReviews: PageReviewItem[], generalNote?: string) => void;
  rejectRequest: (requestId: string, reason: string) => void;
  addAuditNote: (id: string, p: number, c: string, s?: 'approved' | 'needs_revision' | 'info') => void;
  submitRevisionByRequester: (id: string, note: string, fileUrl?: string, fileName?: string) => Promise<void>;
  notification: { message: string; type: 'success' | 'info' | 'error' } | null; showToast: (m: string, t?: 'success' | 'info' | 'error') => void;
  selectedRequestForDetail: ApprovalRequest | null; setSelectedRequestForDetail: (req: ApprovalRequest | null) => void;
  fullScreenPreviewRequest: ApprovalRequest | null; setFullScreenPreviewRequest: (req: ApprovalRequest | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const API_BASE = 'https://kintouncoffee.id/ams/api';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('approval');
  const [users, setUsers] = useState<UserProfile[]>(usersData as UserProfile[]);
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => localStorage.getItem('ams_is_logged_in') === 'true');
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('ams_logged_in_user_id');
    return (usersData as UserProfile[]).find(u => u.id === savedId) || (usersData as UserProfile[])[0];
  });
  
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isUsersLoaded, setIsUsersLoaded] = useState(false);
  
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<ApprovalRequest | null>(null);
  const [fullScreenPreviewRequest, setFullScreenPreviewRequest] = useState<ApprovalRequest | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(prev => (prev?.message === message ? null : prev)), 4000);
  };

  useEffect(() => {
    fetch(`${API_BASE}/sync.php`).then(res => res.json()).then(res => { if (res.success && res.data) setRequests(res.data); setIsDbLoaded(true); }).catch(() => setIsDbLoaded(true));
    fetch(`${API_BASE}/sync_users.php`).then(res => res.json()).then(res => { if (res.success && res.data) setUsers(res.data); setIsUsersLoaded(true); }).catch(() => setIsUsersLoaded(true));
  }, []);

  useEffect(() => {
    const updatedCurrentUser = users.find(u => u.id === currentUser.id);
    if (updatedCurrentUser && updatedCurrentUser.signatureBase64 !== currentUser.signatureBase64) {
      setCurrentUser(updatedCurrentUser);
    }
  }, [users, currentUser.id]);

  useEffect(() => {
    if (!isDbLoaded) return;
    fetch(`${API_BASE}/sync.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requests) }).catch(err => console.warn('Gagal sinkronisasi DB:', err));
  }, [requests, isDbLoaded]);

  useEffect(() => {
    if (!isUsersLoaded) return;
    fetch(`${API_BASE}/sync_users.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users) }).catch(err => console.warn('Gagal sinkronisasi User:', err));
  }, [users, isUsersLoaded]);

  useEffect(() => {
    localStorage.setItem('ams_is_logged_in', isLoggedIn ? 'true' : 'false');
    if (currentUser?.id) localStorage.setItem('ams_logged_in_user_id', currentUser.id);
  }, [isLoggedIn, currentUser]);

  const login = (u: string, p: string) => {
    if (!u || !p) return { success: false, message: 'Wajib diisi.' };
    const target = users.find(x => x.name.toLowerCase() === u.toLowerCase() || x.id.toLowerCase() === u.toLowerCase());
    if (!target) return { success: false, message: 'Akun tidak ditemukan.' };
    setCurrentUser(target); setIsLoggedIn(true); setActiveTab('approval');
    showToast(`Berhasil masuk sebagai ${target.name}`, 'success'); return { success: true };
  };
  
  const logout = () => { setIsLoggedIn(false); localStorage.removeItem('ams_is_logged_in'); };
  
  const saveSignature = (userId: string, sig: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, signatureBase64: sig } : u)));
    if (currentUser.id === userId) setCurrentUser(prev => ({ ...prev, signatureBase64: sig }));
    showToast('Tanda tangan tersimpan permanen di server!', 'success');
  };

  const uploadToHostinger = async (base64Data: string, fileName: string): Promise<string> => {
    if (base64Data.startsWith('http')) return base64Data;
    try {
      const response = await fetch(`${API_BASE}/upload.php`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfDataUrl: base64Data, fileName }) });
      const data = await response.json();
      if (data.success) return data.fileUrl;
      return base64Data;
    } catch (e) { return base64Data; }
  };

  const blobToBase64 = async (blobUrl: string): Promise<string> => {
    if (!blobUrl.startsWith('blob:')) return blobUrl;
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const createNewRequest = async (t: string, fn: string, fd: string, a: any[], tp: number, c: 'Design' | 'WO Existing', sp: number[], forceNewPage: boolean = false) => {
    const requestId = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const steps: ApproverStep[] = a.map((appr, idx) => ({ id: `step_${requestId}_${idx}`, order: idx, userId: appr.userId, userName: appr.userName, roleTitle: appr.roleTitle, status: idx === 0 ? 'waiting' : 'pending' }));
    const safeFileName = `${requestId}_${fn.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const livePdfUrl = await uploadToHostinger(fd, safeFileName);
    
    const newReq: any = { 
      id: requestId, title: t, category: c, requesterId: currentUser.id, requesterName: currentUser.name, requesterRole: currentUser.role, 
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'in_progress', 
      pdfFileName: safeFileName, pdfDataUrl: livePdfUrl, originalPdfDataUrl: livePdfUrl, selectedPages: sp, flow: steps, 
      currentStepIndex: 0, totalPages: tp, pageReviews: [], auditNotes: [], revisionHistory: [], forceNewPage
    };
    
    setRequests(prev => [newReq as ApprovalRequest, ...prev]); 
    showToast('Pengajuan berhasil dikirim.', 'success'); 
    return requestId;
  };

  const performAutoSignApproval = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    const req = requests.find(r => r.id === requestId);
    if (!req || req.flow[req.currentStepIndex].userId !== currentUser.id) return { success: false, message: 'Akses ditolak.' };
    const sig = currentUser.signatureBase64;
    if (!sig) return { success: false, message: 'Tanda tangan tidak ditemukan.' };
    
    try {
      const idx = req.currentStepIndex;
      let targetFile = req.pdfDataUrl;
      let targetFileName = req.pdfFileName;
      let docType: 'WO' | 'PR' | 'PO' = 'WO';
      
      if (req.category === 'WO Existing') {
        if (idx === 5 || idx === 6) { targetFile = req.prPdfDataUrl!; targetFileName = req.prPdfFileName!; docType = 'PR'; }
        else if (idx === 7) { targetFile = req.poPdfDataUrl!; targetFileName = req.poPdfFileName!; docType = 'PO'; }
      }

      const isForceNewPage = (req as any).forceNewPage || false;
      const res = await executeOneClickAutoSign(targetFile, sig, req.flow[idx], req.flow, req.category, req.selectedPages, req.id, docType, isForceNewPage);
      if (!res.success) return { success: false, message: res.error || 'Gagal.' };

      const base64Signed = await blobToBase64(res.signedPdfUrl);
      const liveSignedUrl = await uploadToHostinger(base64Signed, targetFileName);

      const nextStepIndex = idx + 1;
      const isCompleted = nextStepIndex >= req.flow.length;
      const updatedFlow = req.flow.map((step, i) => {
        if (i === idx) return { ...step, status: 'approved' as const, signedAt: new Date().toISOString(), signatureUrl: sig };
        if (i === nextStepIndex) return { ...step, status: 'waiting' as const };
        return step;
      });

      setRequests(prev => prev.map(r => {
        if (r.id !== requestId) return r;
        const updates: any = { flow: updatedFlow, currentStepIndex: nextStepIndex, status: isCompleted ? 'completed' : 'in_progress', updatedAt: new Date().toISOString() };
        if (docType === 'WO') updates.pdfDataUrl = liveSignedUrl;
        if (docType === 'PR') updates.prPdfDataUrl = liveSignedUrl;
        if (docType === 'PO') updates.poPdfDataUrl = liveSignedUrl;
        return { ...r, ...updates };
      }));
      return { success: true, message: isCompleted ? 'Selesai.' : 'Diteruskan.' };
    } catch (err: any) { return { success: false, message: err?.message }; }
  };

  const uploadPRAndForward = async (requestId: string, fileName: string, dataUrl: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    
    // PERBAIKAN: Deteksi apakah ini upload ulang revisi PR
    const isRevision = !!req.prPdfDataUrl;
    let prRevCount = 1;
    if (isRevision && req.prPdfFileName) {
      const match = req.prPdfFileName.match(/_Rev(\d+)/);
      if (match) prRevCount = parseInt(match[1]) + 1;
    }
    
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.pdf$/i, '');
    const safePrFileName = isRevision 
      ? `${requestId}_PR_${cleanFileName}_Rev${prRevCount}.pdf`
      : `${requestId}_PR_${cleanFileName}.pdf`;

    const livePrUrl = await uploadToHostinger(dataUrl, safePrFileName);
    
    setRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      const updatedFlow = [...r.flow];
      
      updatedFlow[4].status = 'approved';
      updatedFlow[4].signedAt = new Date().toISOString();
      updatedFlow[5].status = 'waiting';
      
      // PERBAIKAN: Reset Tanda Tangan Tahap 5 ke atas khusus untuk revisi PR
      if (isRevision) {
        updatedFlow[5].signedAt = undefined;
        updatedFlow[5].signatureUrl = undefined;
        if (updatedFlow[6]) {
          updatedFlow[6].status = 'pending';
          updatedFlow[6].signedAt = undefined;
          updatedFlow[6].signatureUrl = undefined;
        }
      }

      return { ...r, prPdfFileName: safePrFileName, prPdfDataUrl: livePrUrl, currentStepIndex: 5, status: 'in_progress', flow: updatedFlow };
    }));
    showToast('PR berhasil diunggah dan diteruskan ke User.', 'success');
  };

  const uploadPOAndComplete = async (requestId: string, fileName: string, dataUrl: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const sig = currentUser.signatureBase64;
    if (!sig) { showToast('Tanda tangan belum diatur!', 'error'); return; }
    
    try {
      const safePoFileName = `${requestId}_PO_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const res = await executeOneClickAutoSign(dataUrl, sig, req.flow[7], req.flow, req.category, req.selectedPages, req.id, 'PO', false);
      const base64Signed = await blobToBase64(res.signedPdfUrl);
      const livePoUrl = await uploadToHostinger(base64Signed, safePoFileName);

      setRequests(prev => prev.map(r => {
        if (r.id !== requestId) return r;
        const updatedFlow = [...r.flow];
        updatedFlow[7].status = 'approved';
        updatedFlow[7].signedAt = new Date().toISOString();
        return { ...r, poPdfFileName: safePoFileName, poPdfDataUrl: livePoUrl, status: 'completed', currentStepIndex: 8, flow: updatedFlow };
      }));
      showToast('PO berhasil diterbitkan dan disetujui!', 'success');
    } catch (err) { showToast('Gagal memproses PO.', 'error'); }
  };

  const rejectPRToMega = (requestId: string, reason: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== requestId) return r;
      const updatedFlow = [...r.flow];
      updatedFlow[5].status = 'pending'; 
      updatedFlow[4].status = 'needs_revision'; 
      return { ...r, status: 'in_progress', currentStepIndex: 4, flow: updatedFlow, notes: `Revisi PR: ${reason}` };
    }));
    showToast('PR dikembalikan ke Purchasing untuk diperbaiki.', 'info');
  };

  const requestRevision = (requestId: string, pageReviews: PageReviewItem[], generalNote?: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      const updatedFlow = [...req.flow];
      updatedFlow[req.currentStepIndex].status = 'needs_revision';
      
      const newHistoryItem: RevisionHistoryItem = {
        id: `rev_${Date.now()}`, createdAt: new Date().toISOString(),
        requestedByUserId: currentUser.id, requestedByUserName: currentUser.name, requestedByUserRole: currentUser.role,
        pageReviews: pageReviews || [], generalNote: generalNote || 'Revisi diperlukan'
      };

      return {
        ...req, status: 'needs_revision', notes: generalNote || 'Perbaikan diminta oleh ' + currentUser.name,
        lastRevisionRequestedBy: currentUser.name, flow: updatedFlow,
        revisionHistory: [...(req.revisionHistory || []), newHistoryItem]
      };
    }));
    showToast('Dokumen dikembalikan ke pengaju untuk direvisi.', 'info');
  };

  const rejectRequest = (requestId: string, reason: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      const updatedFlow = [...req.flow];
      updatedFlow[req.currentStepIndex].status = 'rejected';
      return { ...req, status: 'rejected', notes: reason, flow: updatedFlow };
    }));
    showToast('Dokumen ditolak.', 'error');
  };

  const addAuditNote = (id: string, pageNumber: number, content: string, status: 'approved' | 'needs_revision' | 'info' = 'info') => {
    setRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      const newNote: AuditNote = {
        id: `note_${Date.now()}`, pageNumber, authorId: currentUser.id, authorName: currentUser.name,
        authorRole: currentUser.role, content, status, createdAt: new Date().toISOString()
      };
      const updatedNotes = [...(req.auditNotes || []), newNote];
      return { ...req, auditNotes: updatedNotes };
    }));
  };

  const submitRevisionByRequester = async (requestId: string, note: string, newPdfDataUrl?: string, newPdfFileName?: string) => {
    const reqToUpdate = requests.find(r => r.id === requestId);
    if (!reqToUpdate) return;
    
    let finalUrl = newPdfDataUrl;
    let finalFileName = reqToUpdate.pdfFileName;
    const updatedHistory = [...(reqToUpdate.revisionHistory || [])];
    const revCount = updatedHistory.length;

    // PERBAIKAN: Jika ada file baru (WO/Design direvisi), buat nama _RevX
    if (newPdfDataUrl && newPdfDataUrl.startsWith('data:')) {
      const baseName = reqToUpdate.pdfFileName.replace(/\.pdf$/i, '').replace(/_Rev\d+$/, '');
      finalFileName = `${baseName}_Rev${revCount || 1}.pdf`;
      finalUrl = await uploadToHostinger(newPdfDataUrl, finalFileName);
    }

    setRequests(prev => prev.map(req => {
      if (req.id !== requestId) return req;
      let updatedFlow = [...req.flow];
      let newStepIndex = req.currentStepIndex;

      // PERBAIKAN: Jika file terganti, Reset seluruh Flow ke Tahap 1
      if (newPdfDataUrl) {
        updatedFlow = updatedFlow.map((step, idx) => ({
          ...step,
          status: idx === 0 ? 'waiting' : 'pending',
          signedAt: undefined,
          signatureUrl: undefined
        }));
        newStepIndex = 0;
      } else {
        // Jika hanya teks, kembali ke approver terakhir
        updatedFlow[req.currentStepIndex].status = 'waiting';
      }

      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1].resolvedAt = new Date().toISOString();
        updatedHistory[updatedHistory.length - 1].resolvedByRequesterName = currentUser.name;
        updatedHistory[updatedHistory.length - 1].requesterResponseNote = note;
      }

      return {
        ...req, status: 'in_progress', pdfDataUrl: finalUrl || req.pdfDataUrl,
        pdfFileName: finalFileName, flow: updatedFlow, currentStepIndex: newStepIndex,
        revisionHistory: updatedHistory, notes: ''
      };
    }));
    showToast('Revisi berhasil dikirim kembali.', 'success');
  };

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab, users, currentUser, setCurrentUser, isLoggedIn, login, logout, requests, saveSignature, createNewRequest, performAutoSignApproval, uploadPRAndForward, uploadPOAndComplete, rejectPRToMega, requestRevision, rejectRequest, notification, showToast, selectedRequestForDetail, setSelectedRequestForDetail, fullScreenPreviewRequest, setFullScreenPreviewRequest, addAuditNote, submitRevisionByRequester }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};