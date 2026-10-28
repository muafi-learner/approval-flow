export type TabType = 'pengajuan' | 'tracking' | 'approval' | 'ttd' | 'profile';

export type ApproverRole = 'Pengaju' | 'Design Lead' | 'Head of Design' | 'PM' | 'PMO' | 'MD' | 'CEO' | 'Finance' | 'Legal' | 'Custom';

export type StepStatus = 'approved' | 'waiting' | 'pending' | 'rejected' | 'needs_revision';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  department?: string; // Menambahkan tanda tanya agar bersifat opsional (tidak wajib ada)
  email: string;
  avatarUrl?: string;
  signatureBase64?: string; // Stored PNG signature
  updatedAt?: string;
}

export interface DetectedSlot {
  slotId?: string;
  pageIndex: number;
  pageNumber: number;
  slotType?: 'table_cell' | 'footer_cell' | 'authorization_box' | 'paraf_corner';
  isFooter?: boolean;
  hasExplicitBox?: boolean;
  slotLabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  safeInnerBox?: { x: number; y: number; width: number; height: number };
  name: string;
  role: string;
  rawText?: string;
  confidence: 'exact_name' | 'keyword_matched' | 'layout_matrix';
  isSigned?: boolean;
}

export interface ApproverStep {
  id: string;
  order: number;
  userId: string;
  userName: string;
  roleTitle: string;
  status: StepStatus;
  signedAt?: string;
  comment?: string;
  signatureUrl?: string;
  detectedSlot?: DetectedSlot;
  detectedSlots?: DetectedSlot[];
}

export interface PageReviewItem {
  pageNumber: number;
  title?: string;
  status: 'approved' | 'needs_revision';
  note?: string;
}

export interface PageAuditNote {
  id: string;
  pageNumber: number;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  status: 'approved' | 'needs_revision' | 'info';
  createdAt: string;
  tag?: string;
}

export interface RevisionHistoryItem {
  id: string;
  createdAt: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedByUserRole: string;
  pageReviews: PageReviewItem[];
  generalNote?: string;
  resolvedAt?: string;
  resolvedByRequesterName?: string;
  requesterResponseNote?: string;
}

export interface ApprovalRequest {
  id: string;
  title: string;
  category: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in_progress' | 'needs_revision' | 'completed' | 'rejected';
  pdfFileName: string;
  pdfDataUrl: string;
  originalPdfDataUrl?: string;
  flow: ApproverStep[];
  currentStepIndex: number;
  notes?: string;
  totalPages?: number;
  pageReviews?: PageReviewItem[];
  auditNotes?: PageAuditNote[];
  revisionHistory?: RevisionHistoryItem[];
  lastRevisionRequestedBy?: string;
}

export interface SignatureDetectionResult {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: 'exact_name' | 'slot_keyword' | 'default_position';
}