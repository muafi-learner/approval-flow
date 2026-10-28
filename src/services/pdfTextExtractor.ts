import * as pdfjsLib from 'pdfjs-dist';
import { DetectedSlot } from '../types';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('pdfjs worker initialization note:', e);
}

export interface UserMultiPageMatch {
  userId: string;
  userName: string;
  roleTitle: string;
  detectedSlot: DetectedSlot;
  detectedSlots: DetectedSlot[];
}

export interface PdfAnalysisResult {
  detectedSlots: DetectedSlot[];
  multiPageFlow: UserMultiPageMatch[];
  documentTitle?: string;
  pageCount: number;
  pagesWithSignatureBoxes: number[];
  extractedTextPreview: string;
}

export async function analyzePdfApproverLayout(
  pdfBuffer: ArrayBuffer,
  knownUsers: { id: string; name: string; role: string }[]
): Promise<PdfAnalysisResult> {
  const allDetectedSlots: DetectedSlot[] = [];
  let pageCount = 1;
  let extractedTextPreview = '';
  let documentTitle = '';

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    pageCount = doc.numPages;

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      const items = textContent.items as any[];

      const pageMatches = new Map<string, { tx: number; ty: number; width: number; rawStr: string }>();

      items.forEach(item => {
        if ('str' in item && item.str.trim()) {
          const rawStr = item.str.trim();
          const cleanStr = rawStr.replace(/[^a-z0-9]/gi, '').toLowerCase();
          const tx = item.transform[4];
          const ty = item.transform[5];
          
          // Beberapa PDF generator (terutama CAD) ngaco ngasih width huruf.
          // Kita pakai estimasi fallback jika width-nya tidak masuk akal.
          const width = item.width || (rawStr.length * 5); 

          extractedTextPreview += rawStr + ' ';

          if (pageNum === 1 && !documentTitle && rawStr.length > 15 && ty > viewport.height - 150) {
            documentTitle = rawStr;
          }

          if (rawStr.length < 35 && ty < 400) {
            knownUsers.forEach(u => {
              const cleanName = u.name.replace(/[^a-z0-9]/gi, '').toLowerCase();
              
              if (cleanStr.includes(cleanName) && cleanName.length > 2) {
                const existingMatch = pageMatches.get(u.id);
                // Pilih yang posisinya paling Bawah (ty terkecil)
                if (!existingMatch || ty < existingMatch.ty) {
                  pageMatches.set(u.id, { tx, ty, width, rawStr });
                }
              }
            });
          }
        }
      });

      pageMatches.forEach((match, userId) => {
        const u = knownUsers.find(k => k.id === userId)!;
        
        // ==========================================
        // PERBAIKAN POSISI X & UKURAN TTD (AGAR LEBIH KE TENGAH)
        // ==========================================
        
        // Ukuran default TTD kita kecilkan sedikit agar muat di kolom CAD yang sempit
        const defaultWidth = 60; 
        const defaultHeight = 25;

        // X: Geser sedikit ke kanan (+12 point) dari hitungan sebelumnya agar centering lebih pas.
        const anchorX = match.tx + (match.width / 2) - (defaultWidth / 2) + 6;
        
        // Y: Angkat 15 point di atas baseline teks nama
        const anchorY = match.ty + 21;

        allDetectedSlots.push({
          slotId: `anchor_p${pageNum}_${u.id}`,
          pageIndex: pageNum - 1,
          pageNumber: pageNum,
          slotType: 'authorization_box',
          isFooter: match.ty < 200,
          hasExplicitBox: false, 
          slotLabel: `Hal ${pageNum} (Di atas teks: ${match.rawStr})`,
          x: anchorX,
          y: anchorY,
          width: defaultWidth,
          height: defaultHeight,
          safeInnerBox: { x: anchorX, y: anchorY, width: defaultWidth, height: defaultHeight },
          name: u.name,
          role: u.role,
          rawText: match.rawStr,
          confidence: 'exact_name',
        });
      });
    }
  } catch (err) {
    console.warn('PDF layout analysis error:', err);
  }

  const multiPageFlow: UserMultiPageMatch[] = [];
  const pagesWithSignatureBoxesSet = new Set<number>();

  allDetectedSlots.forEach(slot => {
    pagesWithSignatureBoxesSet.add(slot.pageNumber || (slot.pageIndex + 1));
  });

  knownUsers.forEach(u => {
    const userSlots = allDetectedSlots.filter(s => s.name.toLowerCase() === u.name.toLowerCase());
    if (userSlots.length > 0) {
      multiPageFlow.push({
        userId: u.id,
        userName: u.name,
        roleTitle: u.role,
        detectedSlot: userSlots[userSlots.length - 1], 
        detectedSlots: userSlots, 
      });
    }
  });

  return {
    detectedSlots: allDetectedSlots,
    multiPageFlow,
    documentTitle: documentTitle || 'Dokumen Persetujuan',
    pageCount,
    pagesWithSignatureBoxes: Array.from(pagesWithSignatureBoxesSet).sort((a, b) => a - b),
    extractedTextPreview: extractedTextPreview.slice(0, 400),
  };
}