import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, ApprovalRequest, ApproverStep, TabType, PageReviewItem, RevisionHistoryItem, AuditNote } from '../types';
import { executeOneClickAutoSign } from '../services/pdfAutoSigner';
import usersData from '../data/users.json';
import { UploadCloud } from 'lucide-react';

interface AppContextType {
  activeTab: TabType; setActiveTab: (tab: TabType) => void;
  users: UserProfile[]; currentUser: UserProfile; setCurrentUser: (user: UserProfile) => void;
  isLoggedIn: boolean; login: (u: string, p: string) => { success: boolean; message?: string }; logout: () => void;
  requests: ApprovalRequest[]; saveSignature: (userId: string, sig: string) => void;
  createNewRequest: (t: string, fn: string, fd: string, a: any[], tp: number, c: 'Design' | 'WO Existing', sp: number[], forceNewPage?: boolean) => Promise<string>;
  performAutoSignApproval: (requestId: string) => Promise<{ success: boolean; message: string }>;
  requestRevision: (requestId: string, pageReviews: PageReviewItem[], generalNote?: string) => void;
  rejectRequest: (requestId: string, reason: string) => void;
  addAuditNote: (id: string, p: number, c: string, s?: 'approved' | 'needs_revision' | 'info') => void;
  submitRevisionByRequester: (id: string, note: string, fileUrl?: string, fileName?: string) => Promise<void>;
  notification: { message: string; type: 'success' | 'info' | 'error' } | null; showToast: (m: string, t?: 'success' | 'info' | 'error') => void;
  selectedRequestForDetail: ApprovalRequest | null; setSelectedRequestForDetail: (req: ApprovalRequest | null) => void;
  fullScreenPreviewRequest: ApprovalRequest | null; setFullScreenPreviewRequest: (req: ApprovalRequest | null) => void;
  uploadPRAndForward: (requestId: string, fileName: string, dataUrl: string) => Promise<void>;
  uploadPOAndComplete: (requestId: string, fileName: string, dataUrl: string) => Promise<void>;
  rejectPRToMega: (requestId: string, reason: string) => void;
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
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<ApprovalRequest | null>(null);
  const [fullScreenPreviewRequest, setFullScreenPreviewRequest] = useState<ApprovalRequest | null>(null);
  
  // State untuk melacak Global Upload Progress
  const [uploadTask, setUploadTask] = useState<{ fileName: string; progress: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(prev => (prev?.message === message ? null : prev)), 4000);
  };

  useEffect(() => {
    fetch(`${API_BASE}/requests_api.php`).then(res => res.json()).then(res => {
       if (res.success && res.data) setRequests(res.data);
     }).catch(err => console.warn('Gagal memuat dokumen:', err));
    
    fetch(`${API_BASE}/sync_users.php`).then(res => res.json()).then(res => {
       if (res.success && res.data && res.data.length > 0) {
        setUsers(res.data);
       } else {
        fetch(`${API_BASE}/sync_users.php`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(usersData)
        }).catch(err => console.warn('Gagal menyuntikkan data JSON ke DB:', err));
      }
    }).catch(err => console.warn('Gagal memuat API user:', err));
  }, []);

  useEffect(() => {
    const updatedCurrentUser = users.find(u => u.id === currentUser.id);
    if (updatedCurrentUser && updatedCurrentUser.signatureBase64 !== currentUser.signatureBase64) {
      setCurrentUser(updatedCurrentUser);
    }
    localStorage.setItem('ams_is_logged_in', isLoggedIn ? 'true' : 'false');
    if (currentUser?.id) localStorage.setItem('ams_logged_in_user_id', currentUser.id);
  }, [users, currentUser, isLoggedIn]);

  const saveRequestToDb = async (action: 'create' | 'update', reqData: ApprovalRequest, logData?: any) => {
    try {
      await fetch(`${API_BASE}/requests_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, request_data: reqData, log_data: logData })
      });
    } catch (e) { console.error('Gagal menyimpan ke database:', e); }
  };

  const login = (u: string, p: string) => {
    if (!u || !p) return { success: false, message: 'Username dan Password wajib diisi.' };
    const target = users.find(x => x.name.toLowerCase() === u.toLowerCase() || x.id.toLowerCase() === u.toLowerCase());
    if (!target) return { success: false, message: 'Akun tidak ditemukan.' };
    const expectedPassword = `${target.name.trim().split(/\s+/)[0].toLowerCase()}1`;
    if (p !== expectedPassword) return { success: false, message: 'Kata sandi salah.' };
    setCurrentUser(target); setIsLoggedIn(true); setActiveTab('approval');
    showToast(`Berhasil masuk sebagai ${target.name}`, 'success'); return { success: true };
  };
  
  const logout = () => { setIsLoggedIn(false); localStorage.removeItem('ams_is_logged_in'); };
  
  const saveSignature = async (userId: string, sig: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, signatureBase64: sig } : u)));
    if (currentUser.id === userId) setCurrentUser(prev => ({ ...prev, signatureBase64: sig }));
    await fetch(`${API_BASE}/sync_users.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_signature', userId, signatureBase64: sig })
    });
    showToast('Tanda tangan tersimpan permanen di server!', 'success');
  };

  // Mengubah fetch menjadi XHR untuk melacak Persentase Upload
  const uploadToHostinger = (base64Data: string, fileName: string, categoryStr: string): Promise<string> => {
    return new Promise((resolve) => {
      if (base64Data.startsWith('http')) return resolve(base64Data);
      
      setUploadTask({ fileName, progress: 0 });
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload.php`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadTask({ fileName, progress: percentComplete });
        }
      };
      
      xhr.onload = () => {
        setTimeout(() => setUploadTask(null), 1000); // Tahan 1 detik saat 100%
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.success ? res.fileUrl : base64Data);
          } catch (err) { resolve(base64Data); }
        } else {
          resolve(base64Data);
        }
      };
      
      xhr.onerror = () => {
        setUploadTask(null);
        showToast('Koneksi terputus saat mengunggah file.', 'error');
        resolve(base64Data);
      };
      
      xhr.send(JSON.stringify({ pdfDataUrl: base64Data, fileName, category: categoryStr }));
    });
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
    
    const livePdfUrl = await uploadToHostinger(fd, safeFileName, c);
    
    const newReq: any = {
       id: requestId, title: t, category: c, requesterId: currentUser.id, requesterName: currentUser.name, requesterRole: currentUser.role,
       createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'in_progress',
       pdfFileName: safeFileName, pdfDataUrl: livePdfUrl, originalPdfDataUrl: livePdfUrl, selectedPages: sp, flow: steps,
       currentStepIndex: 0, totalPages: tp, pageReviews: [], auditNotes: [], revisionHistory: [], forceNewPage
    };
    
    setRequests(prev => [newReq as ApprovalRequest, ...prev]);
    await saveRequestToDb('create', newReq, { actor_name: currentUser.name, action: 'Submit', note: `Dokumen diajukan ke kategori ${c === 'Design' ? 'Design' : 'In General'}` });
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
      const isForceNewPage = (req as any).forceNewPage || false;
      
      const res = await executeOneClickAutoSign(req.pdfDataUrl, sig, req.flow[idx], req.flow, req.category, req.selectedPages, req.id, 'WO', isForceNewPage);
      if (!res.success) return { success: false, message: res.error || 'Gagal.' };
      
      const base64Signed = await blobToBase64(res.signedPdfUrl);
      const liveSignedUrl = await uploadToHostinger(base64Signed, req.pdfFileName, req.category);
      
      const nextStepIndex = idx + 1;
      const isCompleted = nextStepIndex >= req.flow.length;
      const updatedFlow = req.flow.map((step, i) => {
        if (i === idx) return { ...step, status: 'approved' as const, signedAt: new Date().toISOString(), signatureUrl: sig };
        if (i === nextStepIndex) return { ...step, status: 'waiting' as const };
        return step;
      });
      
      const updatedReq = {
         ...req, flow: updatedFlow, currentStepIndex: nextStepIndex,
         status: isCompleted ? 'completed' : 'in_progress', updatedAt: new Date().toISOString(),
         pdfDataUrl: liveSignedUrl
       };
      
      setRequests(prev => prev.map(r => r.id === requestId ? updatedReq as ApprovalRequest : r));
      await saveRequestToDb('update', updatedReq as ApprovalRequest, { actor_name: currentUser.name, action: 'Approve', note: `Tahap ${idx + 1} disetujui` });
      
      return { success: true, message: isCompleted ? 'Selesai.' : 'Diteruskan.' };
    } catch (err: any) { return { success: false, message: err?.message }; }
  };

  const requestRevision = async (requestId: string, pageReviews: PageReviewItem[], generalNote?: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const updatedFlow = [...req.flow];
    updatedFlow[req.currentStepIndex].status = 'needs_revision';
    
    const newHistoryItem: RevisionHistoryItem = {
      id: `rev_${Date.now()}`, createdAt: new Date().toISOString(),
      requestedByUserId: currentUser.id, requestedByUserName: currentUser.name, requestedByUserRole: currentUser.role,
      pageReviews: pageReviews || [], generalNote: generalNote || 'Revisi diperlukan'
    };
    const updatedReq = {
      ...req, status: 'needs_revision', notes: generalNote || 'Perbaikan diminta oleh ' + currentUser.name,
      lastRevisionRequestedBy: currentUser.name, flow: updatedFlow,
      revisionHistory: [...(req.revisionHistory || []), newHistoryItem]
    };
    setRequests(prev => prev.map(r => r.id === requestId ? updatedReq as ApprovalRequest : r));
    await saveRequestToDb('update', updatedReq as ApprovalRequest, { actor_name: currentUser.name, action: 'Needs Revision', note: generalNote || 'Dokumen butuh revisi' });
    showToast('Dokumen dikembalikan ke pengaju untuk direvisi.', 'info');
  };

  const rejectRequest = async (requestId: string, reason: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    const updatedFlow = [...req.flow];
    updatedFlow[req.currentStepIndex].status = 'rejected';
    const updatedReq = { ...req, status: 'rejected', notes: reason, flow: updatedFlow };
    setRequests(prev => prev.map(r => r.id === requestId ? updatedReq as ApprovalRequest : r));
    await saveRequestToDb('update', updatedReq as ApprovalRequest, { actor_name: currentUser.name, action: 'Rejected', note: reason });
    showToast('Dokumen ditolak.', 'error');
  };

  const addAuditNote = async (id: string, pageNumber: number, content: string, status: 'approved' | 'needs_revision' | 'info' = 'info') => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const newNote: AuditNote = {
      id: `note_${Date.now()}`, pageNumber, authorId: currentUser.id, authorName: currentUser.name,
      authorRole: currentUser.role, content, status, createdAt: new Date().toISOString()
    };
    const updatedReq = { ...req, auditNotes: [...(req.auditNotes || []), newNote] };
    setRequests(prev => prev.map(r => r.id === id ? updatedReq as ApprovalRequest : r));
    await saveRequestToDb('update', updatedReq as ApprovalRequest, { actor_name: currentUser.name, action: 'Add Note', note: `Halaman ${pageNumber}: ${content}` });
  };

  const submitRevisionByRequester = async (requestId: string, note: string, newPdfDataUrl?: string, newPdfFileName?: string) => {
    const reqToUpdate = requests.find(r => r.id === requestId);
    if (!reqToUpdate) return;
    
    let finalUrl = newPdfDataUrl;
    let finalFileName = reqToUpdate.pdfFileName;
    const updatedHistory = [...(reqToUpdate.revisionHistory || [])];
    const revCount = updatedHistory.length;
    
    if (newPdfDataUrl && newPdfDataUrl.startsWith('data:')) {
      const baseName = reqToUpdate.pdfFileName.replace(/\.pdf$/i, '').replace(/_Rev\d+$/, '');
      finalFileName = `${baseName}_Rev${revCount || 1}.pdf`;
      finalUrl = await uploadToHostinger(newPdfDataUrl, finalFileName, reqToUpdate.category);
    }
    
    let updatedFlow = [...reqToUpdate.flow];
    let newStepIndex = reqToUpdate.currentStepIndex;
    if (newPdfDataUrl) {
      updatedFlow = updatedFlow.map((step, idx) => ({
        ...step, status: idx === 0 ? 'waiting' : 'pending', signedAt: undefined, signatureUrl: undefined
      }));
      newStepIndex = 0;
    } else {
      updatedFlow[reqToUpdate.currentStepIndex].status = 'waiting';
    }
    if (updatedHistory.length > 0) {
      updatedHistory[updatedHistory.length - 1].resolvedAt = new Date().toISOString();
      updatedHistory[updatedHistory.length - 1].resolvedByRequesterName = currentUser.name;
      updatedHistory[updatedHistory.length - 1].requesterResponseNote = note;
    }
    
    const finalReq = {
      ...reqToUpdate, status: 'in_progress', pdfDataUrl: finalUrl || reqToUpdate.pdfDataUrl,
      pdfFileName: finalFileName, flow: updatedFlow, currentStepIndex: newStepIndex,
      revisionHistory: updatedHistory, notes: ''
    };
    
    setRequests(prev => prev.map(r => r.id === requestId ? finalReq as ApprovalRequest : r));
    await saveRequestToDb('update', finalReq as ApprovalRequest, { actor_name: currentUser.name, action: 'Resubmit', note: newPdfDataUrl ? 'Mengunggah file revisi' : 'Membalas catatan tanpa file baru' });
    showToast('Revisi berhasil dikirim kembali.', 'success');
  };

  const uploadPRAndForward = async () => {};
  const uploadPOAndComplete = async () => {};
  const rejectPRToMega = () => {};

  return (
    <AppContext.Provider value={{ activeTab, setActiveTab, users, currentUser, setCurrentUser, isLoggedIn, login, logout, requests, saveSignature, createNewRequest, performAutoSignApproval, uploadPRAndForward, uploadPOAndComplete, rejectPRToMega, requestRevision, rejectRequest, notification, showToast, selectedRequestForDetail, setSelectedRequestForDetail, fullScreenPreviewRequest, setFullScreenPreviewRequest, addAuditNote, submitRevisionByRequester }}>
      {children}
      
      {/* GLOBAL TOAST UPLOAD PROGRESS */}
      {uploadTask && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white p-4 rounded-xl shadow-2xl w-80 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 mb-2">
            <UploadCloud className="w-5 h-5 text-blue-400 animate-bounce" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold truncate">Mengunggah ke Server...</p>
              <p className="text-[10px] text-neutral-400 truncate">{uploadTask.fileName}</p>
            </div>
            <span className="text-xs font-bold text-blue-400">{uploadTask.progress}%</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadTask.progress}%` }} />
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};