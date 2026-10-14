import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  PenTool,
  RotateCcw,
  RotateCw,
  Trash2,
  CheckCircle2,
  Download,
  ShieldCheck,
  Check,
  Scissors
} from 'lucide-react';
import { cropCanvasTo4by3 } from '../services/signatureHelper';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export const TTDView: React.FC = () => {
  const { currentUser, saveSignature, showToast } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Warna TTD strictly hitam
  const penColor = '#000000';
  // Ukuran goresan dapat diatur
  const [penWidth, setPenWidth] = useState(2.5);

  // Stroke history for 100% vector-precise Undo / Redo
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Redraw all strokes on canvas with smooth round caps
  const redrawCanvas = useCallback((allStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of allStrokes) {
      if (!stroke.points || stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        // Single point (dot)
        const pt = stroke.points[0];
        ctx.arc(pt.x, pt.y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 600;
      canvas.height = 450; // Rasio 4:3 (600 / 450 = 4 / 3)
      redrawCanvas(strokes);
    }
  }, [redrawCanvas, strokes]);

  // Exact cursor coordinate calculation (fixes cursor misalignment / scale offset)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    currentStrokeRef.current = {
      points: [coords],
      color: penColor,
      width: penWidth,
    };

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    currentStrokeRef.current.points.push(coords);

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const updatedStrokes = [...strokes, currentStrokeRef.current];
      setStrokes(updatedStrokes);
      setRedoStack([]); // New drawing action clears redo history
    }
    currentStrokeRef.current = null;
  };

  // Undo (Only icon in UI)
  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const remaining = strokes.slice(0, strokes.length - 1);
    setStrokes(remaining);
    setRedoStack(prev => [...prev, last]);
    redrawCanvas(remaining);
  }, [strokes, redrawCanvas]);

  // Redo (Only icon in UI)
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, redoStack.length - 1);
    const newStrokes = [...strokes, next];
    setStrokes(newStrokes);
    setRedoStack(newRedo);
    redrawCanvas(newStrokes);
  }, [redoStack, strokes, redrawCanvas]);

  // Clear
  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Keyboard shortcut listener (Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Save Signature strictly cropped to 4:3
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokes.length === 0) {
      showToast('Goreskan tanda tangan terlebih dahulu pada papan.', 'error');
      return;
    }

    const cropped4by3 = cropCanvasTo4by3(canvas);
    saveSignature(currentUser.id, cropped4by3);
    showToast(`Tanda tangan ${currentUser.name} berhasil disimpan dalam rasio 4:3.`, 'success');
  };

  // Download Transparent PNG in 4:3
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;

    const cropped4by3 = cropCanvasTo4by3(canvas);
    const a = document.createElement('a');
    a.href = cropped4by3;
    a.download = `TTD_${currentUser.name.replace(/\s+/g, '_')}_4x3.png`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
          Tanda Tangan Digital
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">
          Buat dan simpan tanda tangan digital untuk akun <span className="font-semibold text-neutral-800">{currentUser.name}</span> ({currentUser.role}).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Interactive Drawing Canvas */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
            {/* Toolbar: Minimalist and modern */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-neutral-100">
              <div className="flex items-center gap-4">
                {/* Pen Color */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">
                    Tinta:
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-800">
                    <span className="w-2.5 h-2.5 rounded-full bg-black" />
                    <span>Hitam</span>
                  </div>
                </div>

                {/* Pen Size / Width */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500">
                    Ketebalan:
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { w: 1.8, label: 'Tipis' },
                      { w: 3.0, label: 'Standar' },
                      { w: 5.0, label: 'Tebal' },
                    ].map(item => (
                      <button
                        key={item.w}
                        type="button"
                        onClick={() => setPenWidth(item.w)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                          penWidth === item.w
                            ? 'bg-neutral-900 text-white font-semibold shadow-2xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Undo & Redo (ONLY ICONS), Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={strokes.length === 0}
                  className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Undo / Batalkan Goresan (Ctrl+Z)"
                  aria-label="Undo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Redo / Kembalikan Goresan (Ctrl+Y)"
                  aria-label="Redo"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors cursor-pointer text-xs font-medium ml-1"
                  title="Hapus Seluruh Goresan"
                  aria-label="Hapus Goresan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>

            {/* Drawing Pad Area - Rasio 4:3 */}
            <div className="relative border border-neutral-300 rounded-xl overflow-hidden bg-white hover:border-neutral-400 transition-colors select-none aspect-[4/3] max-w-lg mx-auto">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full block cursor-crosshair touch-none"
              />

              {/* Subtle Document Signature Line */}
              <div className="absolute bottom-6 left-10 right-10 border-b border-dashed border-neutral-200 pointer-events-none" />

              {strokes.length === 0 && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-400">
                  <PenTool className="w-8 h-8 stroke-1 mb-1.5 opacity-40 text-neutral-500" />
                  <span className="text-xs sm:text-sm font-semibold text-neutral-600">Goreskan tanda tangan Anda di area ini</span>
                  <span className="text-[11px] text-neutral-400 mt-0.5 font-medium">(Tinta hitam resmi · format vektor halus)</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-neutral-500">
                {strokes.length > 0 ? `${strokes.length} goresan` : 'Kanvas siap'}
              </span>

              <div className="flex items-center gap-2">
                {strokes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PNG</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Tanda Tangan</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Active Signature Status Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-5 shadow-xs text-center">
            <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3 pb-2 border-b border-neutral-100">
              Tanda Tangan Aktif
            </h3>

            {currentUser.signatureBase64 ? (
              <div className="space-y-3">
                <div className="p-3 bg-neutral-50/70 border border-neutral-200/80 rounded-xl flex flex-col items-center justify-center">
                  <div className="w-36 aspect-[4/3] rounded-lg border border-neutral-200/90 bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-2xs">
                    <img
                      src={currentUser.signatureBase64}
                      alt="Tanda Tangan Aktif (4:3)"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1.5 font-medium">Format Rasio 4:3</span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Siap untuk Auto-Sign</span>
                </div>

                <p className="text-[11px] text-neutral-500 leading-relaxed text-left">
                  Tanda tangan ini akan otomatis ditempatkan pada kolom otorisasi dokumen saat Anda menyetujui pengajuan.
                </p>
              </div>
            ) : (
              <div className="py-6 text-neutral-400 space-y-1.5">
                <PenTool className="w-7 h-7 mx-auto stroke-1 opacity-40" />
                <p className="text-xs">Belum ada tanda tangan aktif.</p>
                <p className="text-[11px] text-neutral-400">
                  Goreskan tanda tangan di kanvas dan klik "Simpan".
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-neutral-900 text-white rounded-2xl shadow-xs text-xs space-y-1.5 border border-neutral-800">
            <div className="flex items-center gap-2 font-semibold text-neutral-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Presisi Penempatan Otomatis</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Sistem mendeteksi kolom tanda tangan dalam dokumen PDF dan menyesuaikan proporsi tanpa merusak tata letak tabel asli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
