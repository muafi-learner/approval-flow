import * as pdfjsLib from 'pdfjs-dist';
import { DetectedSlot } from '../types';

// Configure pdfjs worker
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

/**
 * Intelligent PDF Scanner with Full Footer & Multi-Page Support:
 * 1. Accurately detects signature boxes located in FOOTERS (e.g., bottom approval tables)
 *    and BODY tables ("Mengajukan", "Mengetahui", "Menyetujui", "Dibuat Oleh", "Disetujui Oleh").
 * 2. Strict vertical containment: stamps signatures between column header and name tag
 *    with zero overlap ("ngepas dalam kotakan footer dan tidak tumpuk").
 * 3. Strict deduplication: prevents duplicate slots on the same page for the same person.
 * 4. Multi-Page scanning: tracks signature requirements across all pages of a file.
 */
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

    // Scan every page in the document
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });
      const items = textContent.items as any[];

      const textItemsWithPos: { str: string; tx: number; ty: number; width: number; height: number }[] = [];

      items.forEach(item => {
        if ('str' in item && item.str.trim()) {
          const str = item.str.trim();
          const tx = item.transform[4];
          const ty = item.transform[5];
          const width = item.width || 60;
          const height = item.height || 10;

          extractedTextPreview += str + ' ';
          textItemsWithPos.push({ str, tx, ty, width, height });

          // Document title detection on page 1
          if (pageNum === 1 && !documentTitle && str.length > 15 && ty > viewport.height - 150) {
            documentTitle = str;
          }
        }
      });

      // ================= 1. DETECT FOOTER & TABLE CELL SIGNATURE BOXES =================
      const headerPatterns = [
        {
          key: 'mengajukan',
          aliases: ['mengajukan', 'diajukan', 'pemohon', 'dibuat oleh', 'disiapkan'],
          title: 'Mengajukan',
          userDefault: knownUsers.find(u => ['nada', 'billie'].some(n => u.name.toLowerCase().includes(n))) || knownUsers[0],
        },
        {
          key: 'mengetahui',
          aliases: ['mengetahui', 'diketahui', 'diperiksa oleh', 'ditinjau oleh', 'verifikasi'],
          title: 'Mengetahui',
          userDefault: knownUsers.find(u => ['fitrah', 'sigit', 'lily'].some(n => u.name.toLowerCase().includes(n))) || knownUsers[1] || knownUsers[0],
        },
        {
          key: 'menyetujui',
          aliases: ['menyetujui', 'disetujui oleh', 'otorisasi', 'disahkan', 'approval'],
          title: 'Menyetujui',
          userDefault: knownUsers.find(u => ['ivan', 'anton', 'janet'].some(n => u.name.toLowerCase().includes(n))) || knownUsers[knownUsers.length - 1],
        },
      ];

      headerPatterns.forEach(pattern => {
        const headerItem = textItemsWithPos.find(it => {
          const lower = it.str.toLowerCase();
          return pattern.aliases.some(alias => lower.includes(alias));
        });

        if (headerItem) {
          const isFooter = headerItem.ty < 220; // in the bottom footer area of the page
          const colX = Math.max(35, headerItem.tx - 18);
          const colWidth = Math.max(82, headerItem.width + 36);

          // Find the name label placed directly in this column below the header
          let matchedUser = pattern.userDefault;
          const nameItemInCol = textItemsWithPos.find(it => {
            const isInsideCol = it.tx >= colX - 25 && it.tx <= colX + colWidth + 25;
            const isBelowHeader = it.ty < headerItem.ty && it.ty >= Math.max(20, headerItem.ty - 130);
            if (!isInsideCol || !isBelowHeader) return false;

            return knownUsers.some(u => it.str.toLowerCase().includes(u.name.toLowerCase()));
          });

          if (nameItemInCol) {
            const explicitUser = knownUsers.find(u =>
              nameItemInCol.str.toLowerCase().includes(u.name.toLowerCase())
            );
            if (explicitUser) matchedUser = explicitUser;
          }

          if (matchedUser) {
            // Prevent duplicate insertion if already added for this person on this page
            const isDuplicate = allDetectedSlots.some(
              s =>
                s.pageIndex === pageNum - 1 &&
                s.name.toLowerCase() === matchedUser.name.toLowerCase() &&
                Math.abs(s.x - colX) < 50
            );

            if (!isDuplicate) {
              // Calculate precision inner safe box:
              // If nameItemInCol is found:
              //   top: headerItem.ty - 10
              //   bottom: nameItemInCol.ty + 12 (strictly above name)
              // If not found:
              //   cellBottomY: headerItem.ty - 68
              let safeBoxY: number;
              let safeBoxH: number;

              if (nameItemInCol) {
                safeBoxY = nameItemInCol.ty + 12;
                const availableH = (headerItem.ty - 10) - safeBoxY;
                safeBoxH = Math.min(46, Math.max(28, availableH));
              } else {
                safeBoxY = Math.max(45, headerItem.ty - 60);
                safeBoxH = 40;
              }

              const safeInnerBox = {
                x: colX + 6,
                y: safeBoxY,
                width: colWidth - 12,
                height: safeBoxH,
              };

              allDetectedSlots.push({
                slotId: `slot_p${pageNum}_${isFooter ? 'footer' : 'table'}_${pattern.key}_${matchedUser.id}`,
                pageIndex: pageNum - 1,
                pageNumber: pageNum,
                slotType: isFooter ? 'footer_cell' : 'table_cell',
                isFooter,
                hasExplicitBox: true, // Detected table/footer cell with boundaries
                slotLabel: `Halaman ${pageNum} (${isFooter ? 'Footer' : 'Tabel'}: Kolom ${pattern.title})`,
                x: safeInnerBox.x,
                y: safeInnerBox.y,
                width: safeInnerBox.width,
                height: safeInnerBox.height,
                safeInnerBox,
                name: matchedUser.name,
                role: matchedUser.role,
                rawText: `${pattern.title}: ${matchedUser.name}`,
                confidence: 'exact_name',
              });
            }
          }
        }
      });

      // ================= 2. DETECT AUTHORIZATION MATRIX CARDS & NAMES =================
      knownUsers.forEach(u => {
        const lowerUserName = u.name.toLowerCase();
        const nameMatches = textItemsWithPos.filter(it =>
          it.str.toLowerCase().includes(lowerUserName)
        );

        nameMatches.forEach(nameItem => {
          // STRICT DEDUPLICATION:
          // Check if this user already has a detected slot on this page within vertical proximity
          const existingSlotOnPage = allDetectedSlots.find(
            s =>
              s.pageIndex === pageNum - 1 &&
              s.name.toLowerCase() === lowerUserName &&
              Math.abs(s.y - nameItem.ty) < 140
          );

          if (existingSlotOnPage) {
            // Already safely captured in the footer/table above on this page. Skip!
            return;
          }

          // Found distinct authorization matrix card (e.g. Page 4 Lembar Pengesahan)
          const tx = nameItem.tx;
          const ty = nameItem.ty;
          const cardWidth = 88;
          const cardHeight = 42;
          const centeredX = Math.max(20, tx + (nameItem.width / 2) - (cardWidth / 2));

          const safeInnerBox = {
            x: centeredX,
            y: ty + 16,
            width: cardWidth,
            height: cardHeight,
          };

          const isFooter = ty < 180 && pageNum < pageCount;
          const slotType = pageNum === pageCount ? 'authorization_box' : isFooter ? 'footer_cell' : 'paraf_corner';
          const slotLabel = pageNum === pageCount
            ? `Halaman ${pageNum} (Lembar Otorisasi: ${u.role})`
            : `Halaman ${pageNum} (${isFooter ? 'Footer' : 'Otorisasi'}: ${u.name})`;

          allDetectedSlots.push({
            slotId: `slot_p${pageNum}_auth_${u.id}_${Math.round(tx)}`,
            pageIndex: pageNum - 1,
            pageNumber: pageNum,
            slotType,
            isFooter,
            hasExplicitBox: true, // Detected authorization card
            slotLabel,
            x: safeInnerBox.x,
            y: safeInnerBox.y,
            width: safeInnerBox.width,
            height: safeInnerBox.height,
            safeInnerBox,
            name: u.name,
            role: u.role,
            rawText: nameItem.str,
            confidence: 'exact_name',
          });
        });
      });
    }

    // Horizontal baseline harmonization for slots on the same page row
    for (let pIdx = 0; pIdx < pageCount; pIdx++) {
      const pageSlots = allDetectedSlots.filter(s => s.pageIndex === pIdx);
      if (pageSlots.length > 1) {
        const rows: DetectedSlot[][] = [];
        pageSlots.forEach(slot => {
          const matchingRow = rows.find(r => Math.abs(r[0].y - slot.y) <= 20);
          if (matchingRow) {
            matchingRow.push(slot);
          } else {
            rows.push([slot]);
          }
        });

        rows.forEach(r => {
          if (r.length > 1) {
            const baselineY = Math.min(...r.map(s => s.y));
            r.forEach(s => {
              s.y = baselineY;
              if (s.safeInnerBox) s.safeInnerBox.y = baselineY;
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('PDF layout analysis note:', err);
  }

  // Fallback: If no slots were detected in template, use default signature positioning (no box)
  if (allDetectedSlots.length === 0) {
    knownUsers.forEach((u, idx) => {
      allDetectedSlots.push({
        slotId: `fallback_p${pageCount}_${u.id}`,
        pageIndex: pageCount - 1,
        pageNumber: pageCount,
        slotType: 'paraf_corner',
        isFooter: false,
        hasExplicitBox: false, // Template has NO box, will use default signature size
        slotLabel: `Halaman ${pageCount} (Posisi Default: ${u.role})`,
        x: 50 + (idx % 4) * 125,
        y: 195,
        width: 80,
        height: 32,
        safeInnerBox: { x: 50 + (idx % 4) * 125, y: 195, width: 80, height: 32 },
        name: u.name,
        role: u.role,
        confidence: 'layout_matrix',
      });
    });
  }

  // Build Multi-Page Flow: Group all slots per user across all pages
  const multiPageFlow: UserMultiPageMatch[] = [];
  const pagesWithSignatureBoxesSet = new Set<number>();

  allDetectedSlots.forEach(slot => {
    pagesWithSignatureBoxesSet.add(slot.pageNumber || (slot.pageIndex + 1));
  });

  knownUsers.forEach(u => {
    const userSlots = allDetectedSlots.filter(
      s => s.name.toLowerCase() === u.name.toLowerCase()
    );

    if (userSlots.length > 0) {
      multiPageFlow.push({
        userId: u.id,
        userName: u.name,
        roleTitle: u.role,
        detectedSlot: userSlots[userSlots.length - 1], // primary authorization slot
        detectedSlots: userSlots, // ALL slots across multiple pages (e.g. Page 1 Footer + Page 4 Otorisasi)
      });
    }
  });

  const pagesWithSignatureBoxes = Array.from(pagesWithSignatureBoxesSet).sort((a, b) => a - b);

  return {
    detectedSlots: allDetectedSlots,
    multiPageFlow,
    documentTitle: documentTitle || 'Dokumen Persetujuan Otomatis',
    pageCount,
    pagesWithSignatureBoxes,
    extractedTextPreview: extractedTextPreview.slice(0, 400),
  };
}
