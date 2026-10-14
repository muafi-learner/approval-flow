import React from 'react';
import {
  FileText,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ApprovalRequest } from '../types';

interface WorkflowDiagramProps {
  request?: ApprovalRequest;
  userAName?: string;
  userARole?: string;
  userBName?: string;
  userBRole?: string;
  userCName?: string;
  userCRole?: string;
  compact?: boolean;
}

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  request,
  userAName = 'User A (Pengaju)',
  userARole = 'Staff / Pemohon',
  userBName = 'User B (Approver 1)',
  userBRole = 'Project Manager / Supervisor',
  userCName = 'User C (Approver 2)',
  userCRole = 'Managing Director / Direksi',
  compact = false,
}) => {
  // If request is provided, resolve names and roles from request
  const submitterName = request?.requesterName || userAName;
  const submitterRole = request?.requesterRole || userARole;

  const approverB = request?.flow?.[0];
  const approverC = request?.flow?.[1];

  const bName = approverB?.userName || userBName;
  const bRole = approverB?.roleTitle || userBRole;

  const cName = approverC?.userName || userCName;
  const cRole = approverC?.roleTitle || userCRole;

  // State determination
  const isNeedsRevision = request?.status === 'needs_revision';
  const isCompleted = request?.status === 'completed';
  const isWaitingB = request?.status === 'in_progress' && request?.currentStepIndex === 0;
  const isWaitingC = request?.status === 'in_progress' && request?.currentStepIndex === 1;

  return (
    <div className={`w-full bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden ${compact ? 'p-3.5' : 'p-5 sm:p-6'}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
              Alur Persetujuan Dokumen (Approval Flow)
            </h3>
            <p className="text-[11px] text-neutral-500">
              User A Mengajukan Surat &rarr; User B Review &rarr; User C Pengesahan Akhir (Revisi berulang jika ditolak)
            </p>
          </div>
        </div>

        {request && (
          <div className="shrink-0">
            {isNeedsRevision && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-full animate-pulse">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                Tahap: User A Sedang Revisi
              </span>
            )}
            {isWaitingB && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Tahap: Menunggu User B ({bName})
              </span>
            )}
            {isWaitingC && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200 rounded-full">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Tahap: Menunggu User C ({cName})
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Selesai & Sah Penuh
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Flow Grid */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* STEP 1: User A */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isNeedsRevision
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/60 shadow-xs'
                : !request || request.status === 'draft'
                ? 'bg-neutral-50/70 border-neutral-200'
                : 'bg-white border-neutral-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Langkah 1
              </span>
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                A
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                User A Submits Letter
              </h4>
            </div>

            <div className="text-xs font-semibold text-neutral-700">
              {submitterName}
            </div>
            <div className="text-[11px] text-neutral-500 truncate mb-3">
              {submitterRole}
            </div>

            {isNeedsRevision ? (
              <div className="p-2 bg-amber-100/70 rounded-lg text-[11px] text-amber-900 font-medium flex items-start gap-1.5 border border-amber-200">
                <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>Menerima koreksi & merevisi dokumen surat</span>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 bg-neutral-100/70 p-2 rounded-lg">
                Mengajukan surat persetujuan ke antrean pejabat
              </div>
            )}
          </div>

          {/* STEP 2: User B */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isWaitingB
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/60 shadow-xs'
                : approverB?.status === 'approved'
                ? 'bg-emerald-50/40 border-emerald-200/80'
                : 'bg-white border-neutral-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Langkah 2
              </span>
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                B
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                User B Approves / Rejects
              </h4>
            </div>

            <div className="text-xs font-semibold text-neutral-700">
              {bName}
            </div>
            <div className="text-[11px] text-neutral-500 truncate mb-3">
              {bRole}
            </div>

            {/* Decision Branches */}
            <div className="space-y-1.5 text-[11px]">
              <div className={`p-1.5 rounded-lg flex items-center justify-between border ${
                approverB?.status === 'approved'
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold'
                  : 'bg-neutral-50 border-neutral-200/70 text-neutral-700'
              }`}>
                <span>&bull; Jika Disetujui:</span>
                <span className="font-semibold text-emerald-700">Lanjut ke User C &rarr;</span>
              </div>

              <div className={`p-1.5 rounded-lg flex items-center justify-between border ${
                isNeedsRevision && request?.currentStepIndex === 0
                  ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-neutral-50 border-neutral-200/70 text-neutral-700'
              }`}>
                <span>&bull; Jika Ditolak:</span>
                <span className="font-semibold text-amber-700">&larr; Kembali ke User A</span>
              </div>
            </div>
          </div>

          {/* STEP 3: User C */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isWaitingC
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/60 shadow-xs'
                : isCompleted || approverC?.status === 'approved'
                ? 'bg-emerald-50/40 border-emerald-200/80'
                : 'bg-white border-neutral-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Langkah 3
              </span>
              <div className="w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                C
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                User C Final Approval
              </h4>
            </div>

            <div className="text-xs font-semibold text-neutral-700">
              {cName}
            </div>
            <div className="text-[11px] text-neutral-500 truncate mb-3">
              {cRole}
            </div>

            {/* Decision Branches */}
            <div className="space-y-1.5 text-[11px]">
              <div className={`p-1.5 rounded-lg flex items-center justify-between border ${
                isCompleted
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold'
                  : 'bg-neutral-50 border-neutral-200/70 text-neutral-700'
              }`}>
                <span>&bull; Jika Disetujui:</span>
                <span className="font-semibold text-emerald-700">Dokumen Sah / Selesai &check;</span>
              </div>

              <div className={`p-1.5 rounded-lg flex items-center justify-between border ${
                isNeedsRevision && request?.currentStepIndex === 1
                  ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-neutral-50 border-neutral-200/70 text-neutral-700'
              }`}>
                <span>&bull; Jika Ditolak:</span>
                <span className="font-semibold text-amber-700">&larr; Kembali ke User A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Return Feedback Loop Banner (When Revision occurs) */}
        <div className="mt-3 p-3 bg-neutral-50/80 border border-neutral-200/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
            <RotateCcw className={`w-3.5 h-3.5 ${isNeedsRevision ? 'text-amber-600 animate-spin' : 'text-neutral-400'}`} />
            <span className="font-semibold text-neutral-800">Siklus Revisi & Pengiriman Ulang:</span>
            <span className="text-neutral-500 hidden sm:inline">
              Jika ditolak di tahap mana pun, surat kembali ke User A untuk diperbaiki, lalu dikirim ulang ke approver.
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 self-end sm:self-auto">
            <span>User A</span>
            <span>&rarr;</span>
            <span>User B</span>
            <span>&rarr;</span>
            <span>User C</span>
            <span>&rarr;</span>
            <span className="text-emerald-600 font-bold">Sah</span>
          </div>
        </div>
      </div>
    </div>
  );
};
