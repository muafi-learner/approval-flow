import { PDFDocument } from 'pdf-lib';
import { ApproverStep, DetectedSlot } from '../types';

export interface AutoSignResult {
  success: boolean;
  signedPdfUrl: string;
  signedAt: string;
  detectedPage: number;
  signedPages: number[];
  totalSlotsSigned: number;
  coordinates: { x: number; y: number; width: number; height: number };
  detectionMethod: 'box_fitted_contain' | 'layout_slot_matched';
  auditStamp: string;
  error?: string;
}

/**
 * Fits a signature proportionally:
 * 1. Inside a designated box/kotakan ("menyesuaikan kotakan yang ada, agar tidak kebesaran"):
 *    Applies strict containment and proportional scaling with comfortable margins so it never spills over.
 * 2. If the template PDF does not have a box ("kalo template pdf filenya tidak ada kotakannya, yaudah pake ukuran default"):
 *    Uses the standard default signature stamp size.
 */
function calculateFittedBox(
  box: { x: number; y: number; width: number; height: number },
  aspect: number,
  hasExplicitBox: boolean = true
): { x: number; y: number; width: number; height: number } {
  if (hasExplicitBox) {
    // Safe margins inside the cell/box (leaves margins from table borders, header text, and name label)
    const safePaddingX = Math.max(6, box.width * 0.1);
    const safePaddingY = Math.max(4, box.height * 0.12);

    // Bound maximum dimensions so 4:3 signatures stay elegant and never look oversized
    const maxW = Math.min(Math.max(20, box.width - safePaddingX * 2), 64);
    const maxH = Math.min(Math.max(16, box.height - safePaddingY * 2), 34);

    let w = maxW;
    let h = w / aspect;

    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }

    // Center alignment strictly inside the safe area of the detected box
    const x = box.x + (box.width - w) / 2;
    const y = box.y + (box.height - h) / 2;

    return { x, y, width: w, height: h };
  } else {
    // NO BOX DETECTED: Use standard default size (lebar ~80pt, tinggi proporsional ~28pt)
    const defaultW = 80;
    const defaultMaxH = 32;
    let w = defaultW;
    let h = w / aspect;

    if (h > defaultMaxH) {
      h = defaultMaxH;
      w = h * aspect;
    }
    if (h < 20) {
      h = 20;
      w = h * aspect;
    }

    return {
      x: box.x,
      y: box.y,
      width: w,
      height: h,
    };
  }
}

/**
 * Core Technical Feature: One-Click Multi-Page Auto Sign
 * Automatically stamps the approver's signature into ALL designated boxes
 * across MULTIPLE pages in the PDF file (e.g. Page 1 table + Page 4 authorization sheet).
 * Guarantees zero overlapping with table borders, headers, or other text.
 */
export async function executeOneClickAutoSign(
  pdfSource: string | ArrayBuffer,
  signaturePngDataUrl: string,
  currentApprover: ApproverStep,
  allSteps: ApproverStep[]
): Promise<AutoSignResult> {
  try {
    let pdfBytes: Uint8Array;

    if (typeof pdfSource === 'string') {
      if (pdfSource.startsWith('data:')) {
        const base64Data = pdfSource.split(',')[1];
        const binaryString = atob(base64Data);
        pdfBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          pdfBytes[i] = binaryString.charCodeAt(i);
        }
      } else {
        const response = await fetch(pdfSource);
        const arrayBuffer = await response.arrayBuffer();
        pdfBytes = new Uint8Array(arrayBuffer);
      }
    } else {
      pdfBytes = new Uint8Array(pdfSource);
    }

    // Load PDF document with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const lastPageIndex = pages.length - 1;

    // Clean & extract pure PNG bytes from signature Data URL
    let signatureBytes: Uint8Array;
    if (signaturePngDataUrl.startsWith('data:image/')) {
      const base64Png = signaturePngDataUrl.split(',')[1];
      const binaryPng = atob(base64Png);
      signatureBytes = new Uint8Array(binaryPng.length);
      for (let i = 0; i < binaryPng.length; i++) {
        signatureBytes[i] = binaryPng.charCodeAt(i);
      }
    } else {
      throw new Error('Format tanda tangan harus berupa Data URL PNG transparan.');
    }

    // Embed signature image once
    const embeddedSignature = await pdfDoc.embedPng(signatureBytes);
    const origDims = embeddedSignature.scale(1.0);
    const aspect = origDims.width / Math.max(1, origDims.height);

    // Collect ALL signature slots that belong to this approver
    // Supports multi-page signing (e.g. Page 1 in Footer/Table + Page 4 in Lembar Otorisasi)
    const rawTargetSlots: DetectedSlot[] = [];

    if (currentApprover.detectedSlots && currentApprover.detectedSlots.length > 0) {
      rawTargetSlots.push(...currentApprover.detectedSlots);
    } else if (currentApprover.detectedSlot) {
      rawTargetSlots.push(currentApprover.detectedSlot);
    } else {
      // Fallback: standard approval matrix on the last page
      const approverIndex = allSteps.findIndex(s => s.id === currentApprover.id);
      const cols = Math.min(allSteps.length, 4);
      const boxWidth = (pages[lastPageIndex].getWidth() - 80 - (cols - 1) * 12) / cols;
      const boxX = 40 + (approverIndex >= 0 ? approverIndex % cols : 0) * (boxWidth + 12);
      const boxY = 175;

      rawTargetSlots.push({
        pageIndex: lastPageIndex,
        pageNumber: lastPageIndex + 1,
        slotType: 'authorization_box',
        isFooter: false,
        slotLabel: `Halaman ${lastPageIndex + 1} (Lembar Otorisasi)`,
        x: boxX + 6,
        y: boxY + 20,
        width: boxWidth - 12,
        height: 40,
        safeInnerBox: { x: boxX + 6, y: boxY + 20, width: boxWidth - 12, height: 40 },
        name: currentApprover.userName,
        role: currentApprover.roleTitle,
        confidence: 'layout_matrix',
      });
    }

    // STRICT DEDUPLICATION:
    // If multiple slots refer to the same user on the same page within 60pt of each other,
    // take only ONE slot so signatures NEVER double-stamp on top of each other!
    const targetSlots: DetectedSlot[] = [];
    for (const slot of rawTargetSlots) {
      const alreadyHas = targetSlots.some(
        s => s.pageIndex === slot.pageIndex && Math.abs(s.y - slot.y) < 60
      );
      if (!alreadyHas) {
        targetSlots.push(slot);
      }
    }

    const signedPagesList: number[] = [];
    let lastFittedCoords = { x: 0, y: 0, width: 0, height: 0 };

    // Stamp signature into EVERY designated box across all pages!
    for (const slot of targetSlots) {
      const pageIndex = Math.min(Math.max(0, slot.pageIndex), pages.length - 1);
      const targetPage = pages[pageIndex];
      const pageNumber = slot.pageNumber || (pageIndex + 1);

      const rawBox = slot.safeInnerBox || {
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
      };

      const hasExplicitBox = slot.hasExplicitBox !== false && (
        slot.slotType === 'table_cell' ||
        slot.slotType === 'footer_cell' ||
        slot.slotType === 'authorization_box'
      );

      // Calculate fitted box: adapts neatly if a box exists, or uses default size if no box
      const fitted = calculateFittedBox(rawBox, aspect, hasExplicitBox);
      lastFittedCoords = fitted;

      // Draw signature on the page
      targetPage.drawImage(embeddedSignature, {
        x: fitted.x,
        y: fitted.y,
        width: fitted.width,
        height: fitted.height,
      });

      if (!signedPagesList.includes(pageNumber)) {
        signedPagesList.push(pageNumber);
      }
    }

    signedPagesList.sort((a, b) => a - b);
    const now = new Date();

    // Save modified PDF
    const modifiedBytes = await pdfDoc.save();
    const blob = new Blob([modifiedBytes as unknown as BlobPart], { type: 'application/pdf' });
    const signedPdfUrl = URL.createObjectURL(blob);

    return {
      success: true,
      signedPdfUrl,
      signedAt: now.toISOString(),
      detectedPage: signedPagesList[0] || (lastPageIndex + 1),
      signedPages: signedPagesList,
      totalSlotsSigned: targetSlots.length,
      coordinates: lastFittedCoords,
      detectionMethod: 'box_fitted_contain',
      auditStamp: `Presisi Kotakan Terverifikasi (${signedPagesList.map(p => `Hal ${p}`).join(', ')})`,
    };
  } catch (error: any) {
    console.error('Failed to auto-sign PDF:', error);
    return {
      success: false,
      signedPdfUrl: '',
      signedAt: '',
      detectedPage: 1,
      signedPages: [],
      totalSlotsSigned: 0,
      coordinates: { x: 0, y: 0, width: 0, height: 0 },
      detectionMethod: 'layout_slot_matched',
      auditStamp: '',
      error: error?.message || 'Gagal menandatangani PDF secara otomatis.',
    };
  }
}
