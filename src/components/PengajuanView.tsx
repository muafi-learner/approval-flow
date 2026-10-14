import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Upload,
  Plus,
  Trash2,
  FileText,
  ArrowRight,
  FileCheck2,
  RefreshCw,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { analyzePdfApproverLayout } from '../services/pdfTextExtractor';
import { createSampleApprovalPdf } from '../services/samplePdfGenerator';
import { DetectedSlot, ApprovalRequest } from '../types';

interface ApproverInput {
  id: string;
  name: string;
  role: string;
  userId: string;
  isMatchedFromPdf?: boolean;
  detectedSlot?: DetectedSlot;
  detectedSlots?: DetectedSlot[];
}

export const PengajuanView: React.FC = () => {
  const { users, currentUser, createNewRequest, setActiveTab, showToast, setFullScreenPreviewRequest } = useApp();

  const [approvalName, setApprovalName] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    dataUrl: string;
    size: string;
    buffer?: ArrayBuffer;
  } | null>(null);

  const [isScanningPdf, setIsScanningPdf] = useState(false);
  const [detectedPageCount, setDetectedPageCount] = useState<number>(4);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial Approver Flow sequence: User B (Approver 1) -> User C (Approver 2)
  const [approverFlow, setApproverFlow] = useState<ApproverInput[]>(() => {
    const userB = users.find(u => u.name === 'Sigit' && u.id !== currentUser.id) ||
      users.find(u => u.name === 'Nada' && u.id !== currentUser.id) ||
      users[0];
    const userC = users.find(u => u.name === 'Ivan' && u.id !== currentUser.id && u.id !== userB.id) ||
      users.find(u => u.role === 'Managing Director') ||
      users[1] || users[0];

    return [
      {
        id: 'step_1',
        name: userB.name,
        role: userB.role,
        userId: userB.id,
        isMatchedFromPdf: false,
      },
      {
        id: 'step_2',
        name: userC.name,
        role: userC.role,
        userId: userC.id,
        isMatchedFromPdf: false,
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scan PDF buffer and adjust approver flow directly from the PDF
  const processAndScanPdfBuffer = async (buffer: ArrayBuffer, fileName: string, dataUrl: string) => {
    setIsScanningPdf(true);

    try {
      const analysis = await analyzePdfApproverLayout(buffer, users);
      if (analysis.pageCount) {
        setDetectedPageCount(analysis.pageCount);
      }

      if (analysis.documentTitle && !approvalName) {
        setApprovalName(analysis.documentTitle);
      }

      if (analysis.multiPageFlow && analysis.multiPageFlow.length > 0) {
        const newFlow: ApproverInput[] = analysis.multiPageFlow.map((match, index) => {
          return {
            id: `scan_${index}_${Date.now()}`,
            name: match.userName,
            role: match.roleTitle,
            userId: match.userId,
            isMatchedFromPdf: true,
            detectedSlot: match.detectedSlot,
            detectedSlots: match.detectedSlots,
          };
        });

        setApproverFlow(newFlow);
        showToast('Berkas dokumen berhasil dimuat.', 'success');
      } else {
        showToast('Berkas dokumen berhasil dimuat.', 'info');
      }
    } catch (err) {
      console.warn('PDF scan note:', err);
    } finally {
      setIsScanningPdf(false);
    }
  };

  // Process a single file object strictly
  const processSingleFile = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Format berkas harus PDF (.pdf)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result as ArrayBuffer;
      const dataUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));

      // Strictly 1 file per approval: replaces previous file
      setSelectedFile({
        name: file.name,
        dataUrl,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        buffer,
      });

      if (!approvalName.trim()) {
        const guessedTitle = file.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');
        setApprovalName(guessedTitle);
      }

      await processAndScanPdfBuffer(buffer, file.name, dataUrl);
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle local PDF file upload (strictly single file)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      showToast('Hanya dapat mengunggah 1 berkas per pengajuan. Berkas pertama yang dipilih.', 'info');
    }

    processSingleFile(files[0]);
    // Reset input so user can pick again if needed
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      showToast('Hanya dapat mengunggah 1 berkas per pengajuan. Berkas pertama yang diproses.', 'info');
    }

    processSingleFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  // Fast Test File Loader (Production testing verification for the 2 official enterprise files)
  const handleLoadTestFile = async (testKey: 'wi_produksi' | 'kintoun_suhat') => {
    setIsScanningPdf(true);

    let slots: { name: string; role: string; order: number }[] = [];
    let titlePreset = '';
    let fileName = '';

    if (testKey === 'wi_produksi') {
      titlePreset = 'WI Produksi Base dan Premix';
      fileName = 'WI_PRODUKSI_BASE_DAN_PREMIX.pdf';
      slots = [
        { name: 'Nada', role: 'Supervisor Audit', order: 0 },
        { name: 'Sigit', role: 'Project Manager', order: 1 },
        { name: 'Fitrah', role: 'RND Manager', order: 2 },
        { name: 'Ivan', role: 'Managing Director', order: 3 },
      ];
    } else {
      titlePreset = 'Persetujuan Desain & Pembukaan Cabang Kintoun Suhat Malang';
      fileName = 'Approval_Desain_Kintoun_Suhat_Malang.pdf';
      slots = [
        { name: 'Billie', role: 'Design Lead', order: 0 },
        { name: 'Lily', role: 'Head of Design', order: 1 },
        { name: 'Sigit', role: 'Operations Manager', order: 2 },
        { name: 'Janet', role: 'Project Manager Officer', order: 3 },
        { name: 'Anton', role: 'CEO', order: 4 },
      ];
    }

    try {
      setApprovalName(titlePreset);
      const generatedUrl = await createSampleApprovalPdf(titlePreset, slots);

      const resp = await fetch(generatedUrl);
      const buffer = await resp.arrayBuffer();

      setSelectedFile({
        name: fileName,
        dataUrl: generatedUrl,
        size: `${(buffer.byteLength / 1024).toFixed(1)} KB`,
        buffer,
      });

      await processAndScanPdfBuffer(buffer, fileName, generatedUrl);
    } catch (err) {
      showToast('Gagal memproses berkas uji coba.', 'error');
    } finally {
      setIsScanningPdf(false);
    }
  };

  const handleAddApprover = () => {
    const newIdx = approverFlow.length;
    const availableUser = users[newIdx % users.length] || users[0];
    setApproverFlow(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: availableUser.name,
        role: availableUser.role,
        userId: availableUser.id,
        isMatchedFromPdf: false,
      },
    ]);
  };

  const handleRemoveApprover = (id: string) => {
    if (approverFlow.length <= 1) {
      showToast('Alur minimal membutuhkan 1 approver', 'error');
      return;
    }
    setApproverFlow(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateApproverUser = (id: string, userId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    setApproverFlow(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              userId: u.id,
              name: u.name,
              role: u.role,
            }
          : item
      )
    );
  };

  const handleUpdateRole = (id: string, newRole: string) => {
    setApproverFlow(prev =>
      prev.map(item => (item.id === id ? { ...item, role: newRole } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!approvalName.trim()) {
      showToast('Nama pengajuan wajib diisi', 'error');
      return;
    }

    if (approverFlow.length === 0) {
      showToast('Tentukan minimal satu approver', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPdfUrl = selectedFile?.dataUrl;
      let finalFileName = selectedFile?.name || 'Dokumen_Pengesahan.pdf';

      if (!finalPdfUrl) {
        const slots = approverFlow.map((a, i) => ({
          name: a.name,
          role: a.role,
          order: i,
        }));
        finalPdfUrl = await createSampleApprovalPdf(approvalName, slots);
      }

      const formattedApprovers = approverFlow.map(a => ({
        userId: a.userId,
        userName: a.name,
        roleTitle: a.role,
        detectedSlot: a.detectedSlot,
        detectedSlots: a.detectedSlots,
      }));

      await createNewRequest(
        approvalName.trim(),
        finalFileName,
        finalPdfUrl,
        formattedApprovers,
        detectedPageCount
      );

      setActiveTab('tracking');
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengirim pengajuan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Ajukan Dokumen Baru
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          Unggah 1 berkas PDF resmi dan tentukan urutan persetujuan pejabat yang berwenang.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dokumen */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
          <div className="pb-3 mb-4 border-b border-neutral-100">
            <h2 className="text-sm sm:text-base font-bold text-neutral-900">
              1. Berkas & Judul Surat
            </h2>
          </div>

          <div className="space-y-4">
            {/* Input: Nama Pengajuan */}
            <div>
              <label htmlFor="approvalName" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Nama / Judul Dokumen <span className="text-rose-500">*</span>
              </label>
              <input
                id="approvalName"
                type="text"
                required
                value={approvalName}
                onChange={e => setApprovalName(e.target.value)}
                placeholder="Contoh: Surat Permohonan Pengadaan Barang"
                className="w-full px-3.5 py-2.5 text-sm bg-neutral-50/70 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white text-neutral-900 placeholder:text-neutral-400 font-medium transition-all"
              />
            </div>

            {/* Document Selection: Strictly 1 File per Approval */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Berkas Dokumen PDF <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-neutral-400">
                  Maksimal 1 berkas PDF
                </span>
              </div>

              {/* Hidden file input strictly multiple=false */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple={false}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* If file is already selected: show single attached file card */}
              {selectedFile ? (
                <div className="border border-neutral-200 bg-neutral-50/60 rounded-xl p-4 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900 truncate">
                            {selectedFile.name}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {selectedFile.size} · {detectedPageCount} Halaman PDF
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const previewReq: ApprovalRequest = {
                            id: 'DRAFT-PREVIEW',
                            title: approvalName || selectedFile.name,
                            category: 'Pra-Pengajuan',
                            requesterId: currentUser.id,
                            requesterName: currentUser.name,
                            requesterRole: currentUser.role,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            status: 'draft',
                            pdfFileName: selectedFile.name,
                            pdfDataUrl: selectedFile.dataUrl,
                            flow: approverFlow.map((a, i) => ({
                              id: a.id,
                              order: i,
                              userId: a.userId,
                              userName: a.name,
                              roleTitle: a.role,
                              status: 'pending',
                              detectedSlot: a.detectedSlot,
                              detectedSlots: a.detectedSlots,
                            })),
                            currentStepIndex: 0,
                            totalPages: detectedPageCount,
                            pageReviews: Array.from({ length: detectedPageCount }, (_, i) => ({
                              pageNumber: i + 1,
                              title: `Halaman ${i + 1}`,
                              status: 'approved',
                            })),
                          };
                          setFullScreenPreviewRequest(previewReq);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Buka Dokumen Layar Penuh"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Buka Surat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Ganti Berkas Dokumen"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Ganti</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state: Clean dropzone */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl p-8 bg-neutral-50/50 hover:bg-white transition-all flex flex-col items-center justify-center text-center cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600 mb-2.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-neutral-900">
                    Klik untuk memilih berkas PDF
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 mb-3">
                    atau seret berkas langsung ke area ini
                  </p>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Pilih File PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Urutan Pejabat Penandatangan */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
          <div className="pb-3 mb-4 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                2. Urutan Pejabat Penandatangan
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Surat akan diserahkan secara sekuensial dari tahap awal hingga akhir.
              </p>
            </div>
            <span className="text-xs font-medium bg-neutral-100 px-2.5 py-0.5 rounded-full text-neutral-700">
              {approverFlow.length} Pejabat
            </span>
          </div>

          {/* Dynamic Approver Rows */}
          <div className="space-y-2.5">
            {approverFlow.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 border border-neutral-200/80 rounded-xl bg-neutral-50/40 hover:bg-white hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-2 sm:w-24 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold text-neutral-800">
                    Tahap {index + 1}
                  </span>
                </div>

                {/* Combined Approver & Jabatan Selector */}
                <div className="flex-1">
                  <select
                    value={step.userId}
                    onChange={e => handleUpdateApproverUser(step.id, e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-900 cursor-pointer shadow-2xs"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delete button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveApprover(step.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Hapus Pejabat Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Step Button */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddApprover}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pejabat</span>
            </button>
          </div>
        </div>

        {/* Submit Bottom Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-200">
          <div className="text-xs text-neutral-500">
            Pengaju aktif: <span className="font-semibold text-neutral-800">{currentUser.name}</span> ({currentUser.role})
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Mengirim Surat...</span>
            ) : (
              <>
                <span>Kirim Pengajuan Surat</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
