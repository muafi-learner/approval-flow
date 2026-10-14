import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Copy, Check, Server, FileCode, Layers, Cpu, Terminal } from 'lucide-react';

export const TechnicalDocsModal: React.FC = () => {
  const { showTechModal, setShowTechModal } = useApp();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!showTechModal) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const projectFileStructure = `approval-system/
├── public/
│   ├── favicon.ico
│   └── samples/
│       └── template-approval.pdf
├── src/
│   ├── components/
│   │   ├── Header.tsx              # Top Navigation (Pengajuan | Tracking | Approval | TTD | Profile)
│   │   ├── PengajuanView.tsx       # Section 1 (Upload/Name) & Section 2 (Flow Builder)
│   │   ├── TrackingView.tsx        # Visual Pipeline Stepper & PDF Audit Drawer
│   │   ├── ApprovalView.tsx        # Incoming Request Queue & One-Click Auto Sign
│   │   ├── TTDView.tsx             # Signature Pad (Draw / Upload / Type)
│   │   ├── ProfileView.tsx         # User Profile & Persona Switcher
│   │   └── TechnicalDocsModal.tsx  # Hostinger Guide & Technical Architecture
│   ├── context/
│   │   └── AppContext.tsx          # State Management for Requests, Steps, Signatures
│   ├── services/
│   │   ├── pdfAutoSigner.ts        # One-Click Auto Sign Engine (pdf-lib)
│   │   ├── samplePdfGenerator.ts   # A4 Approval PDF Generator
│   │   └── signatureHelper.ts      # Canvas Signature & Cursive Renderer
│   ├── types/
│   │   └── index.ts                # TypeScript Interfaces & Models
│   ├── App.tsx                     # Root App Shell & Tab View Router
│   ├── main.tsx                    # React Entrypoint
│   └── index.css                   # Tailwind CSS Setup
├── dist/                           # Production build output (Ready for Hostinger public_html)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── .htaccess                   # Apache URL Rewrite for Hostinger SPA
├── index.html                      # Entry HTML file
├── package.json                    # Dependencies (pdf-lib, react, tailwindcss)
├── vite.config.ts                  # Vite Bundler Config
└── README.md                       # Documentation & Deployment Instructions`;

  const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`;

  const oneClickSnippet = `import { PDFDocument } from 'pdf-lib';

/**
 * Technical Implementation: One-Click Auto Sign Engine
 * 1. Analyzes target PDF bytes
 * 2. Matches approver name in document coordinates
 * 3. Injects transparent PNG signature exactly above their name
 */
export async function oneClickAutoSignInjector({
  pdfBytes,           // Uint8Array of existing PDF
  signaturePngBytes,  // Uint8Array of user's PNG signature
  approverName,       // e.g. "Janet"
  approverRole,       // e.g. "PMO"
  stepIndex,          // Step number in sequence
  totalSteps          // Total approvers
}) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const targetPage = pages[pages.length - 1]; // Signature matrix on last page
  const { width, height } = targetPage.getSize();

  // 1. Calculate coordinate matrix
  const marginX = 40;
  const cols = Math.min(totalSteps, 4);
  const boxWidth = (width - marginX * 2 - (cols - 1) * 12) / cols;
  const boxX = marginX + (stepIndex % cols) * (boxWidth + 12);
  const boxY = 175; // Signature box baseline

  const sigWidth = Math.min(boxWidth - 20, 110);
  const sigHeight = 44;
  const sigX = boxX + (boxWidth - sigWidth) / 2;
  const sigY = boxY + 34; // Positioned cleanly above the printed name line

  // 2. Embed user's PNG signature
  const embeddedImage = await pdfDoc.embedPng(signaturePngBytes);

  // 3. Inject image onto the detected coordinates
  targetPage.drawImage(embeddedImage, {
    x: sigX,
    y: sigY,
    width: sigWidth,
    height: sigHeight,
  });

  // 4. Return signed PDF bytes
  return await pdfDoc.save();
}`;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
              DOCS
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Arsitektur & Hostinger Deployment Specifications
              </h2>
              <p className="text-xs text-neutral-500">
                Panduan struktur kode, alur One-Click Auto Sign, dan deployment ke Hostinger.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTechModal(false)}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 text-xs leading-relaxed">
          {/* Section 1: File Structure */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-neutral-700" />
                1. Project File Structure (Deliverable 1)
              </h3>
              <button
                onClick={() => copyToClipboard(projectFileStructure, 'structure')}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
              >
                {copiedSection === 'structure' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'structure' ? 'Tersalin' : 'Salin Struktur'}</span>
              </button>
            </div>
            <pre className="p-4 bg-neutral-900 text-neutral-200 rounded-xl overflow-x-auto font-mono text-[11px] leading-5">
              {projectFileStructure}
            </pre>
          </div>

          {/* Section 2: Core Feature One-Click Auto Sign */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-neutral-700" />
                2. Algoritma One-Click Auto Sign (Deliverable 3 & Snippet)
              </h3>
              <button
                onClick={() => copyToClipboard(oneClickSnippet, 'snippet')}
                className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
              >
                {copiedSection === 'snippet' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSection === 'snippet' ? 'Tersalin' : 'Salin Kode Snippet'}</span>
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-neutral-800 mb-3">
              <strong className="text-neutral-900">Mengapa Menggunakan pdf-lib di Sisi Klien?</strong>
              <p className="mt-1 text-neutral-700">
                Untuk hosting standar seperti Hostinger Shared Hosting (cPanel / hPanel), memproses PDF langsung di frontend menggunakan <code>pdf-lib</code> menghilangkan kebutuhan server Node.js berat atau instalasi Poppler/Ghostscript di backend. Pemrosesan berjalan 100% instan di browser user dan menghasilkan file PDF resmi siap unduh.
              </p>
            </div>

            <pre className="p-4 bg-neutral-900 text-neutral-200 rounded-xl overflow-x-auto font-mono text-[11px] leading-5">
              {oneClickSnippet}
            </pre>
          </div>

          {/* Section 3: Hostinger Deployment Guide */}
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Server className="w-4 h-4 text-neutral-700" />
              3. Langkah Deployment ke Hostinger (GitHub & File Manager)
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="font-semibold text-neutral-900 mb-1">
                  Metode A: Standard Web Hosting (Shared Hosting / hPanel)
                </div>
                <ol className="list-decimal list-inside space-y-1 text-neutral-700">
                  <li>Jalankan perintah build lokal: <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">npm run build</code></li>
                  <li>Buka folder <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">dist/</code> yang dihasilkan</li>
                  <li>Login ke <strong>hPanel Hostinger &rarr; File Manager</strong></li>
                  <li>Masuk ke direktori <strong>public_html/</strong></li>
                  <li>Unggah semua isi folder <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">dist/*</code> ke dalam <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">public_html/</code></li>
                  <li>Tambahkan file <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">.htaccess</code> berikut untuk routing SPA:</li>
                </ol>
                <pre className="mt-2 p-2.5 bg-neutral-800 text-neutral-200 rounded-lg font-mono text-[10px]">
                  {htaccessContent}
                </pre>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                <div className="font-semibold text-neutral-900 mb-1">
                  Metode B: Otomatis via GitHub Actions ke Hostinger FTP / VPS
                </div>
                <p className="text-neutral-700">
                  Setup workflow <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">.github/workflows/deploy.yml</code> menggunakan action <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">SamKirkland/FTP-Deploy-Action</code> yang akan otomatis meng-compile dan mengunggah ke FTP Hostinger setiap Anda melakukan <code>git push origin main</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={() => setShowTechModal(false)}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Tutup Dokumentasi
          </button>
        </div>
      </div>
    </div>
  );
};
