import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PenTool, Trash2, CheckCircle2, X, Upload, Info } from 'lucide-react';
import { cropCanvasTo4by3, SIGNATURE_WIDTH, SIGNATURE_HEIGHT } from '../services/signatureHelper';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, saveSignature, showToast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showUploadWarning, setShowUploadWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasDrawn(false);
      setShowUploadWarning(false);
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

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('Harap unggah file gambar (PNG/JPG)', 'error');
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      showToast('Ukuran gambar melebihi batas (Maksimal 1MB)', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Konversi semua pixel warna non-transparan menjadi hitam pekat
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            data[i] = 0;     // Red
            data[i + 1] = 0; // Green
            data[i + 2] = 0; // Blue
          }
        }
        ctx.putImageData(imageData, 0, 0);
        
        setHasDrawn(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
    ctx.strokeStyle = '#000000'; // Hitam pekat murni
    ctx.lineWidth = 5.0; // Ketebalan brush ditingkatkan
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

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cropped4by3 = cropCanvasTo4by3(canvas);
    saveSignature(currentUser.id, cropped4by3);
    showToast(`Tanda tangan berhasil diperbarui.`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Konten Utama */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100">
              <PenTool className="w-4 h-4 text-neutral-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Tanda Tangan Digital</h3>
              <p className="text-xs text-neutral-500 mt-0.5 font-medium">{currentUser.name} <span className="text-neutral-300 mx-1">•</span> {currentUser.role}</p>
            </div>
          </div>
          <button
             type="button"
             onClick={onClose}
             className="p-2 -mr-2 -mt-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-neutral-700">Area Kanvas</span>
          <div className="flex items-center gap-3">
            <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleUploadImage} className="hidden" />
            <button
               type="button"
               onClick={() => setShowUploadWarning(true)}
               className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Unggah (Maks. 1MB)
            </button>
            {hasDrawn && (
              <>
                <span className="w-px h-3 bg-neutral-200" />
                <button
                   type="button"
                   onClick={clearCanvas}
                   className="text-[11px] font-medium text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                </button>
              </>
            )}
          </div>
        </div>

        <div
           className={`relative rounded-xl overflow-hidden transition-all duration-300 flex items-center justify-center touch-none mb-6 ${
            hasDrawn
               ? 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)]'
               : 'bg-neutral-50/50 border-2 border-dashed border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
          }`}
        >
          <canvas
            ref={canvasRef}
            width={SIGNATURE_WIDTH}
            height={SIGNATURE_HEIGHT}
            className="w-full aspect-[4/3] max-w-[340px] block cursor-crosshair mix-blend-multiply"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-neutral-400">
              <span className="text-[11px] font-medium text-neutral-400">Goreskan tanda tangan di sini</span>
            </div>
          )}
        </div>

        <div className="pt-5 border-t border-neutral-100 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="flex-1 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-400 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {hasDrawn && <CheckCircle2 className="w-4 h-4" />}
            Simpan Tanda Tangan
          </button>
        </div>

        {/* OVERLAY POP-UP WARNING UNGGAH */}
        {showUploadWarning && (
          <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl w-full p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4 text-blue-600 border border-blue-100">
                <Info className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900 mb-2">Ketentuan Format Gambar</h4>
              <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                Untuk menghindari error pada sistem stempel PDF, pastikan gambar yang Anda unggah memiliki format <strong>PNG transparan (tanpa latar belakang putih)</strong> dengan rasio proporsi <strong>4:3</strong>.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowUploadWarning(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadWarning(false);
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#0B1A28] hover:bg-[#152D40] rounded-lg transition-colors"
                >
                  Mengerti & Lanjutkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};