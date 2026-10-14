import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PenTool, Trash2, CheckCircle2, X, RefreshCw, Sparkles, Scissors } from 'lucide-react';
import { cropCanvasTo4by3, generateSyntheticSignature, SIGNATURE_WIDTH, SIGNATURE_HEIGHT } from '../services/signatureHelper';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, saveSignature, showToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasDrawn(false);
      // Initialize blank transparent canvas with 4:3 ratio
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleGenerateCursive = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cursiveData = generateSyntheticSignature(currentUser.name, '#0f172a');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasDrawn(true);
    };
    img.src = cursiveData;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Pangkas dan format menjadi rasio persis 4:3
    const cropped4by3 = cropCanvasTo4by3(canvas);
    saveSignature(currentUser.id, cropped4by3);
    showToast(`Tanda tangan ${currentUser.name} dipangkas ke format 4:3 dan berhasil disimpan.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900">Ubah Tanda Tangan</h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center gap-0.5">
                  <Scissors className="w-2.5 h-2.5" />
                  <span>Ukuran 4:3</span>
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">{currentUser.name} · {currentUser.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area with 4:3 Ratio */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-700">Goreskan TTD di bawah:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGenerateCursive}
                className="text-[11px] font-medium text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 border border-neutral-200/60"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Otomatis Kaligrafi</span>
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            </div>
          </div>

          <div className="relative border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50/50 p-1 flex items-center justify-center touch-none">
            <canvas
              ref={canvasRef}
              width={SIGNATURE_WIDTH}
              height={SIGNATURE_HEIGHT}
              className="w-full aspect-[4/3] max-w-[340px] bg-white rounded-lg cursor-crosshair shadow-2xs block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {/* Subtle guideline & watermark */}
            <div className="absolute bottom-6 left-8 right-8 border-b border-dashed border-neutral-200/80 pointer-events-none" />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-400">
                <PenTool className="w-7 h-7 stroke-1 mb-1 opacity-30 text-neutral-600" />
                <span className="text-xs font-semibold text-neutral-500">Area Kanvas Tanda Tangan</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">Otomatis dipangkas & diatur ke proporsi 4:3</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 px-1">
            <span>Rasio target: <strong className="text-neutral-700 font-semibold">4:3</strong> (400 × 300 px)</span>
            <span className="text-emerald-600 font-medium">Tinta hitam resmi</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simpan TTD (Ukuran 4:3)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
