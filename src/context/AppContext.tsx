import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  ApprovalRequest,
  ApproverStep,
  TabType,
  DetectedSlot,
  PageReviewItem,
  RevisionHistoryItem,
} from '../types';
import { generateSyntheticSignature } from '../services/signatureHelper';
import { executeOneClickAutoSign } from '../services/pdfAutoSigner';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  users: UserProfile[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  isLoggedIn: boolean;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  requests: ApprovalRequest[];
  saveSignature: (userId: string, signatureDataUrl: string) => void;
  createNewRequest: (
    title: string,
    pdfFileName: string,
    pdfDataUrl: string,
    approvers: {
      userId: string;
      userName: string;
      roleTitle: string;
      detectedSlot?: DetectedSlot;
      detectedSlots?: DetectedSlot[];
    }[],
    totalPages?: number
  ) => Promise<string>;
  performAutoSignApproval: (requestId: string) => Promise<{ success: boolean; message: string }>;
  requestRevision: (requestId: string, pageReviews: PageReviewItem[], generalNote?: string) => void;
  submitRevisionByRequester: (
    requestId: string,
    responseNote: string,
    revisedPdfDataUrl?: string,
    revisedFileName?: string
  ) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => void;
  resetDemoData: () => void;
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  selectedRequestForDetail: ApprovalRequest | null;
  setSelectedRequestForDetail: (req: ApprovalRequest | null) => void;
  fullScreenPreviewRequest: ApprovalRequest | null;
  setFullScreenPreviewRequest: (req: ApprovalRequest | null) => void;
  addAuditNote: (
    requestId: string,
    pageNumber: number,
    content: string,
    status?: 'approved' | 'needs_revision' | 'info',
    tag?: string
  ) => void;
  updatePageReview: (
    requestId: string,
    pageNumber: number,
    status: 'approved' | 'needs_revision',
    note?: string
  ) => void;
  markAllPagesReview: (
    requestId: string,
    status: 'approved' | 'needs_revision'
  ) => void;
  showTechModal: boolean;
  setShowTechModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Official Enterprise User Profiles
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_ivan',
    name: 'Ivan',
    role: 'Managing Director',
    department: 'Direksi Eksekutif',
    email: 'ivan@company.com',
  },
  {
    id: 'user_sigit',
    name: 'Sigit',
    role: 'Project Manager',
    department: 'Manajemen Proyek',
    email: 'sigit@company.com',
  },
  {
    id: 'user_fitrah',
    name: 'Fitrah',
    role: 'RND Manager',
    department: 'RND & Inovasi',
    email: 'fitrah@company.com',
  },
  {
    id: 'user_nada',
    name: 'Nada',
    role: 'Supervisor Audit',
    department: 'Audit & QA',
    email: 'nada@company.com',
  },
  {
    id: 'user_billie',
    name: 'Billie',
    role: 'Design Lead',
    department: 'Desain Kreatif',
    email: 'billie@company.com',
  },
  {
    id: 'user_lily',
    name: 'Lily',
    role: 'Head of Design',
    department: 'Desain Kreatif',
    email: 'lily@company.com',
  },
  {
    id: 'user_janet',
    name: 'Janet',
    role: 'Project Manager Officer',
    department: 'PMO & Keuangan',
    email: 'janet@company.com',
  },
  {
    id: 'user_anton',
    name: 'Anton',
    role: 'CEO',
    department: 'Direksi Eksekutif',
    email: 'anton@company.com',
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('approval');

  // Enterprise Users State
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('ams_users_v11');
    if (saved) {
      try {
        const parsed: UserProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.map(u => {
            const init = INITIAL_USERS.find(iu => iu.name.toLowerCase() === u.name.toLowerCase() || iu.id === u.id);
            return init ? { ...u, role: init.role, department: init.department } : u;
          });
          INITIAL_USERS.forEach(initUser => {
            const exists = merged.some(
              u => u.id === initUser.id || u.name.toLowerCase() === initUser.name.toLowerCase()
            );
            if (!exists) {
              merged.push({
                ...initUser,
                signatureBase64: generateSyntheticSignature(initUser.name),
              });
            }
          });
          return merged;
        }
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_USERS.map(u => ({
      ...u,
      signatureBase64: generateSyntheticSignature(u.name),
    }));
  });

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ams_is_logged_in_v9') === 'true';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('ams_logged_in_user_id_v9');
    const found = users.find(u => u.id === savedId);
    return found || users.find(u => u.name === 'Ivan') || users[0];
  });

  // Production Requests List: starts clean and empty unless user submitted requests
  const [requests, setRequests] = useState<ApprovalRequest[]>(() => {
    const saved = localStorage.getItem('ams_requests_v9');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<ApprovalRequest | null>(null);
  const [fullScreenPreviewRequest, setFullScreenPreviewRequest] = useState<ApprovalRequest | null>(null);
  const [showTechModal, setShowTechModal] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sync users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ams_users_v11', JSON.stringify(users));
    } catch (e) {
      // quota safeguard
    }
  }, [users]);

  // Sync active user & login state
  useEffect(() => {
    localStorage.setItem('ams_is_logged_in_v9', isLoggedIn ? 'true' : 'false');
    if (currentUser?.id) {
      localStorage.setItem('ams_logged_in_user_id_v9', currentUser.id);
    }
  }, [isLoggedIn, currentUser]);

  // Save requests to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ams_requests_v9', JSON.stringify(requests));
    } catch (e) {
      // quota safeguard
    }
  }, [requests]);

  // Login handler: username & password verification (password must equal username)
  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const u = usernameInput.trim();
    const p = passwordInput.trim();

    if (!u) {
      return { success: false, message: 'Username tidak boleh kosong.' };
    }
    if (!p) {
      return { success: false, message: 'Password tidak boleh kosong.' };
    }

    // Logic: password must equal username (case-insensitive)
    if (u.toLowerCase() !== p.toLowerCase()) {
      return {
        success: false,
        message: 'Password tidak cocok. Sesuai ketentuan, password harus sama dengan username (contoh: ivan / ivan).',
      };
    }

    // Match existing user
    let target = users.find(
      x => x.name.toLowerCase() === u.toLowerCase() || x.id.toLowerCase() === u.toLowerCase()
    );

    // If new user name, create user profile dynamically
    if (!target) {
      const capName = u.charAt(0).toUpperCase() + u.slice(1);
      target = {
        id: `user_${u.toLowerCase()}_${Date.now()}`,
        name: capName,
        role: 'Staff Otorisasi',
        department: 'Operasional',
        email: `${u.toLowerCase()}@company.com`,
        signatureBase64: generateSyntheticSignature(capName),
      };
      setUsers(prev => [...prev, target!]);
    }

    setCurrentUser(target);
    setIsLoggedIn(true);
    setActiveTab('approval');
    showToast(`Berhasil masuk sebagai ${target.name} (${target.role})`, 'success');
    return { success: true };
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('ams_is_logged_in_v9');
    showToast('Anda telah keluar dari akun.', 'info');
  };

  const saveSignature = (userId: string, signatureDataUrl: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, signatureBase64: signatureDataUrl, updatedAt: new Date().toISOString() } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, signatureBase64: signatureDataUrl }));
    }
    showToast('Tanda tangan digital berhasil diperbarui.', 'success');
  };

  const createNewRequest = async (
    title: string,
    pdfFileName: string,
    pdfDataUrl: string,
    approvers: {
      userId: string;
      userName: string;
      roleTitle: string;
      detectedSlot?: DetectedSlot;
      detectedSlots?: DetectedSlot[];
    }[],
    totalPages: number = 4
  ): Promise<string> => {
    const requestId = `REQ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const steps: ApproverStep[] = approvers.map((appr, idx) => ({
      id: `step_${requestId}_${idx}`,
      order: idx,
      userId: appr.userId,
      userName: appr.userName,
      roleTitle: appr.roleTitle,
      status: idx === 0 ? 'waiting' : 'pending',
      detectedSlot: appr.detectedSlot,
      detectedSlots: appr.detectedSlots,
    }));

    const defaultPageReviews: PageReviewItem[] = Array.from({ length: totalPages }, (_, i) => ({
      pageNumber: i + 1,
      title: `Halaman ${i + 1}`,
      status: 'approved',
    }));

    const newReq: ApprovalRequest = {
      id: requestId,
      title,
      category: 'General Approval',
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterRole: currentUser.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'in_progress',
      pdfFileName,
      pdfDataUrl,
      originalPdfDataUrl: pdfDataUrl,
      flow: steps,
      currentStepIndex: 0,
      totalPages,
      pageReviews: defaultPageReviews,
    };

    setRequests(prev => [newReq, ...prev]);
    showToast(`Pengajuan "${title}" berhasil dikirim ke antrean.`, 'success');
    return requestId;
  };

  /**
   * Performs One-Click Auto Sign for the current active user on the target request
   */
  const performAutoSignApproval = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) {
      return { success: false, message: 'Dokumen pengajuan tidak ditemukan.' };
    }

    const currentApprover = targetReq.flow[targetReq.currentStepIndex];
    if (!currentApprover) {
      return { success: false, message: 'Tahapan persetujuan tidak valid.' };
    }

    if (currentApprover.userId !== currentUser.id) {
      return {
        success: false,
        message: `Hanya ${currentApprover.userName} (${currentApprover.roleTitle}) yang memiliki hak untuk tahap ini.`,
      };
    }

    let signatureToUse = currentUser.signatureBase64;
    if (!signatureToUse) {
      signatureToUse = generateSyntheticSignature(currentUser.name);
      saveSignature(currentUser.id, signatureToUse);
    }

    try {
      const signResult = await executeOneClickAutoSign(
        targetReq.pdfDataUrl,
        signatureToUse,
        currentApprover,
        targetReq.flow
      );

      if (!signResult.success) {
        return { success: false, message: signResult.error || 'Gagal menandatangani berkas PDF.' };
      }

      // Progress workflow to next approver
      const nextStepIndex = targetReq.currentStepIndex + 1;
      const isWorkflowCompleted = nextStepIndex >= targetReq.flow.length;

      const updatedFlow = targetReq.flow.map((step, idx) => {
        if (idx === targetReq.currentStepIndex) {
          return {
            ...step,
            status: 'approved' as const,
            signedAt: new Date().toISOString(),
            signatureUrl: signatureToUse,
          };
        }
        if (idx === nextStepIndex) {
          return {
            ...step,
            status: 'waiting' as const,
          };
        }
        return step;
      });

      const updatedRequest: ApprovalRequest = {
        ...targetReq,
        pdfDataUrl: signResult.signedPdfUrl,
        flow: updatedFlow,
        currentStepIndex: nextStepIndex,
        status: isWorkflowCompleted ? 'completed' : 'in_progress',
        updatedAt: new Date().toISOString(),
      };

      setRequests(prev => prev.map(r => (r.id === requestId ? updatedRequest : r)));

      const multiPageNotice = signResult.signedPages && signResult.signedPages.length > 1
        ? ` (${signResult.signedPages.length} Halaman: ${signResult.signedPages.join(', ')})`
        : '';

      const successMsg = isWorkflowCompleted
        ? `Dokumen telah disetujui penuh & ditandatangani${multiPageNotice}. Seluruh alur selesai!`
        : `Berhasil ditandatangani${multiPageNotice}. Dokumen diteruskan ke ${updatedFlow[nextStepIndex].userName} (${updatedFlow[nextStepIndex].roleTitle}).`;

      showToast(successMsg, 'success');
      return { success: true, message: successMsg };
    } catch (err: any) {
      const msg = err?.message || 'Terjadi kesalahan sistem saat membubuhkan tanda tangan.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  /**
   * Request Revision per page or whole document back to Requester
   */
  const requestRevision = (
    requestId: string,
    pageReviews: PageReviewItem[],
    generalNote?: string
  ) => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    const revisedPages = pageReviews.filter(p => p.status === 'needs_revision');
    const revisionSummary = revisedPages.length > 0
      ? `Perlu Revisi pada Halaman: ${revisedPages.map(p => p.pageNumber).join(', ')}. ${generalNote || ''}`
      : generalNote || 'Perlu perbaikan dokumen sebelum persetujuan.';

    const newRevisionEntry: RevisionHistoryItem = {
      id: `rev_${Date.now()}`,
      createdAt: new Date().toISOString(),
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      requestedByUserRole: currentUser.role,
      pageReviews,
      generalNote: generalNote || '',
    };

    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const updatedFlow = [...r.flow];
        if (updatedFlow[r.currentStepIndex]) {
          updatedFlow[r.currentStepIndex] = {
            ...updatedFlow[r.currentStepIndex],
            status: 'needs_revision',
            comment: revisionSummary,
          };
        }
        return {
          ...r,
          status: 'needs_revision',
          flow: updatedFlow,
          updatedAt: new Date().toISOString(),
          notes: revisionSummary,
          pageReviews,
          lastRevisionRequestedBy: currentUser.name,
          revisionHistory: [...(r.revisionHistory || []), newRevisionEntry],
        };
      })
    );

    showToast(`Catatan revisi dikirimkan ke pengaju (${targetReq.requesterName}). Alur ditahan sementara.`, 'info');
  };

  /**
   * Requester submits revised PDF & notes to continue the workflow
   */
  const submitRevisionByRequester = async (
    requestId: string,
    responseNote: string,
    revisedPdfDataUrl?: string,
    revisedFileName?: string
  ) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;

        const updatedFlow = [...r.flow];
        if (updatedFlow[r.currentStepIndex]) {
          updatedFlow[r.currentStepIndex] = {
            ...updatedFlow[r.currentStepIndex],
            status: 'waiting',
            comment: `Revisi dikirim oleh pengaju: ${responseNote}`,
          };
        }

        const updatedHistory = (r.revisionHistory || []).map((h, i, arr) => {
          if (i === arr.length - 1 && !h.resolvedAt) {
            return {
              ...h,
              resolvedAt: new Date().toISOString(),
              resolvedByRequesterName: currentUser.name,
              requesterResponseNote: responseNote,
            };
          }
          return h;
        });

        const resetPages = (r.pageReviews || []).map(p => ({
          ...p,
          status: 'approved' as const,
        }));

        const updated: ApprovalRequest = {
          ...r,
          status: 'in_progress',
          pdfDataUrl: revisedPdfDataUrl || r.pdfDataUrl,
          pdfFileName: revisedFileName || r.pdfFileName,
          flow: updatedFlow,
          updatedAt: new Date().toISOString(),
          revisionHistory: updatedHistory,
          pageReviews: resetPages,
          notes: `Revisi diperbarui oleh ${currentUser.name}: ${responseNote}`,
        };
        return updated;
      })
    );
    showToast('Revisi dokumen berhasil dikirimkan kembali ke approver.', 'success');
  };

  const rejectRequest = (requestId: string, reason: string) => {
    const target = requests.find(r => r.id === requestId);
    const approverName = currentUser.name;
    const approverRole = currentUser.role;

    const newRevisionEntry: RevisionHistoryItem = {
      id: `rev_${Date.now()}`,
      createdAt: new Date().toISOString(),
      requestedByUserId: currentUser.id,
      requestedByUserName: approverName,
      requestedByUserRole: approverRole,
      pageReviews: target?.pageReviews || [],
      generalNote: reason || 'Dokumen ditolak dan dikembalikan untuk diperbaiki.',
    };

    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const updatedFlow = [...r.flow];
        if (updatedFlow[r.currentStepIndex]) {
          updatedFlow[r.currentStepIndex] = {
            ...updatedFlow[r.currentStepIndex],
            status: 'needs_revision',
            comment: reason ? `Ditolak oleh ${approverName}: ${reason}` : 'Ditolak dan perlu revisi',
          };
        }
        return {
          ...r,
          status: 'needs_revision',
          flow: updatedFlow,
          updatedAt: new Date().toISOString(),
          notes: reason ? `Ditolak oleh ${approverName}: ${reason}` : 'Dokumen ditolak dan perlu perbaikan.',
          lastRevisionRequestedBy: approverName,
          revisionHistory: [...(r.revisionHistory || []), newRevisionEntry],
        };
      })
    );
    showToast(`Dokumen ditolak & dikembalikan ke ${target?.requesterName || 'Pengaju'} untuk direvisi sesuai alur.`, 'info');
  };

  const addAuditNote = (
    requestId: string,
    pageNumber: number,
    content: string,
    status: 'approved' | 'needs_revision' | 'info' = 'info',
    tag?: string
  ) => {
    if (!content.trim()) return;
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageNumber,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content: content.trim(),
      status,
      createdAt: new Date().toISOString(),
      tag,
    };

    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const updatedNotes = [...(r.auditNotes || []), newNote];
        const updatedPageReviews = [...(r.pageReviews || [])];
        const existingPrIdx = updatedPageReviews.findIndex(p => p.pageNumber === pageNumber);
        if (existingPrIdx >= 0) {
          if (status === 'needs_revision' || status === 'approved') {
            updatedPageReviews[existingPrIdx] = {
              ...updatedPageReviews[existingPrIdx],
              status,
              note: content.trim(),
            };
          }
        }
        return {
          ...r,
          auditNotes: updatedNotes,
          pageReviews: updatedPageReviews,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Sync active full-screen preview request if open
    setFullScreenPreviewRequest(prev => {
      if (prev && prev.id === requestId) {
        const updatedNotes = [...(prev.auditNotes || []), newNote];
        const updatedPageReviews = [...(prev.pageReviews || [])];
        const existingPrIdx = updatedPageReviews.findIndex(p => p.pageNumber === pageNumber);
        if (existingPrIdx >= 0 && (status === 'needs_revision' || status === 'approved')) {
          updatedPageReviews[existingPrIdx] = {
            ...updatedPageReviews[existingPrIdx],
            status,
            note: content.trim(),
          };
        }
        return {
          ...prev,
          auditNotes: updatedNotes,
          pageReviews: updatedPageReviews,
        };
      }
      return prev;
    });

    showToast(`Catatan Halaman ${pageNumber} berhasil direkam ke jejak riwayat.`, 'success');
  };

  const updatePageReview = (
    requestId: string,
    pageNumber: number,
    status: 'approved' | 'needs_revision',
    note?: string
  ) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const totalPages = r.totalPages || 4;
        const cur: PageReviewItem[] = r.pageReviews
          ? [...r.pageReviews]
          : Array.from({ length: totalPages }, (_, i) => ({ pageNumber: i + 1, status: 'approved' as const, note: '' }));
        const idx = cur.findIndex(p => p.pageNumber === pageNumber);
        if (idx >= 0) {
          cur[idx] = { ...cur[idx], status, note: note ?? cur[idx].note };
        } else {
          cur.push({ pageNumber, status, note });
        }
        return { ...r, pageReviews: cur, updatedAt: new Date().toISOString() };
      })
    );

    setFullScreenPreviewRequest(prev => {
      if (prev && prev.id === requestId) {
        const cur = prev.pageReviews ? [...prev.pageReviews] : [];
        const idx = cur.findIndex(p => p.pageNumber === pageNumber);
        if (idx >= 0) {
          cur[idx] = { ...cur[idx], status, note: note ?? cur[idx].note };
        } else {
          cur.push({ pageNumber, status, note });
        }
        return { ...prev, pageReviews: cur };
      }
      return prev;
    });
  };

  const markAllPagesReview = (
    requestId: string,
    status: 'approved' | 'needs_revision'
  ) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id !== requestId) return r;
        const totalPages = r.totalPages || 4;
        const cur = Array.from({ length: totalPages }, (_, i) => ({
          pageNumber: i + 1,
          title: `Halaman ${i + 1}`,
          status,
          note: status === 'approved' ? '' : undefined,
        }));
        return { ...r, pageReviews: cur, updatedAt: new Date().toISOString() };
      })
    );

    setFullScreenPreviewRequest(prev => {
      if (prev && prev.id === requestId) {
        const totalPages = prev.totalPages || 4;
        const cur = Array.from({ length: totalPages }, (_, i) => ({
          pageNumber: i + 1,
          title: `Halaman ${i + 1}`,
          status,
          note: status === 'approved' ? '' : undefined,
        }));
        return { ...prev, pageReviews: cur };
      }
      return prev;
    });
    showToast(status === 'approved' ? 'Seluruh lembar halaman ditandai Disetujui.' : 'Seluruh halaman ditandai Perlu Revisi.', 'info');
  };

  const resetDemoData = () => {
    localStorage.removeItem('ams_requests_v9');
    localStorage.removeItem('ams_requests_v8');
    localStorage.removeItem('ams_requests_v7');
    localStorage.removeItem('ams_requests');
    localStorage.removeItem('ams_users_v11');
    localStorage.removeItem('ams_users_v10');
    localStorage.removeItem('ams_users_v9');
    setRequests([]);
    const freshUsers = INITIAL_USERS.map(u => ({
      ...u,
      signatureBase64: generateSyntheticSignature(u.name),
    }));
    setUsers(freshUsers);
    const curr = freshUsers.find(u => u.name === 'Ivan') || freshUsers[0];
    setCurrentUser(curr);
    showToast('Data simulasi & profil tanda tangan (rasio 4:3) telah direset ke kondisi awal.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        users,
        currentUser,
        setCurrentUser,
        isLoggedIn,
        login,
        logout,
        requests,
        saveSignature,
        createNewRequest,
        performAutoSignApproval,
        requestRevision,
        submitRevisionByRequester,
        rejectRequest,
        resetDemoData,
        notification,
        showToast,
        selectedRequestForDetail,
        setSelectedRequestForDetail,
        fullScreenPreviewRequest,
        setFullScreenPreviewRequest,
        addAuditNote,
        updatePageReview,
        markAllPagesReview,
        showTechModal,
        setShowTechModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
