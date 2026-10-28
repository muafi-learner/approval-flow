export type TabType = 'approval' | 'pengajuan' | 'tracking';

export interface DetectedSlot {
  slotId?: string;
  pageIndex: number;
  pageNumber?: number;
  slotType: string;
  isFooter: boolean;
  hasExplicitBox: boolean;
  slotLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  safeInnerBox?: { x: number; y: number; width: number; height: number };
  name: string;
  role: string;
  confidence: string;
  rawText?: string;
}

export interface ApproverStep {
  id: string;
  order: number;
  userId: string;
  userName: string;
  roleTitle: string;
  status: 'pending' | 'waiting' | 'approved' | 'needs_revision' | 'rejected';
  detectedSlot?: DetectedSlot;
  detectedSlots?: DetectedSlot[];
  signedAt?: string;
  signatureUrl?: string;
}

export interface PageReviewItem {
  pageNumber: number;
  title: string;
  status: 'approved' | 'needs_revision';
  note?: string;
}

export interface RevisionHistoryItem {
  id: string;
  createdAt: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedByUserRole: string;
  pageReviews: PageReviewItem[];
  generalNote: string;
  resolvedAt?: string;
  resolvedByRequesterName?: string;
  requesterResponseNote?: string;
}

export interface AuditNote {
  id: string;
  pageNumber: number;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  status: 'approved' | 'needs_revision' | 'info';
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  category: 'Design' | 'WO Existing';
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in_progress' | 'needs_revision' | 'completed' | 'rejected';
  pdfFileName: string;
  pdfDataUrl: string;
  originalPdfDataUrl: string;
  prPdfFileName?: string;
  prPdfDataUrl?: string;
  poPdfFileName?: string;
  poPdfDataUrl?: string;
  selectedPages: number[];
  flow: ApproverStep[];
  currentStepIndex: number;
  totalPages: number;
  pageReviews?: PageReviewItem[];
  auditNotes?: AuditNote[];
  revisionHistory?: RevisionHistoryItem[];
  notes?: string;
  lastRevisionRequestedBy?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  signatureBase64?: string;
}