import { PDFDocument, rgb, StandardFonts, PDFPage, PDFImage, PDFFont } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { ApproverStep, DetectedSlot } from '../types';

try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('pdfjs worker initialization note:', e);
}

export interface AutoSignResult {
  success: boolean;
  signedPdfUrl: string;
  signedAt: string;
  detectedPage: number;
  signedPages: number[];
  totalSlotsSigned: number;
  coordinates: { x: number; y: number; width: number; height: number };
  detectionMethod: 'box_fitted_contain' | 'layout_slot_matched' | 'dynamic_margin_shift';
  auditStamp: string;
  error?: string;
}

function drawDigitalStamp(
  page: PDFPage, signatureImage: PDFImage, approver: ApproverStep, requestId: string,
  x: number, y: number, fontRegular: PDFFont, fontBold: PDFFont, category: 'Design' | 'WO Existing'
) {
  if (category === 'Design') {
    const DESIGN_STAMP_W = 55; const DESIGN_STAMP_H = 45;
    const sigDims = signatureImage.scale(1.0);
    const aspect = sigDims.width / Math.max(1, sigDims.height);
    const maxSigW = DESIGN_STAMP_W - 10; const maxSigH = DESIGN_STAMP_H - 18;
    let sigW = maxSigW; let sigH = sigW / aspect;
    if (sigH > maxSigH) { sigH = maxSigH; sigW = sigH * aspect; }
    const signatureYOffset = 6;
    
    page.drawImage(signatureImage, {
      x: x + (DESIGN_STAMP_W - sigW) / 2,
      y: y + DESIGN_STAMP_H - sigH - 2 + signatureYOffset,
      width: sigW, height: sigH
    });
    
    const firstName = approver.userName.trim().split(/\s+/)[0].toUpperCase();
    const roleWords = approver.roleTitle.trim().split(/\s+/);
    const roleAcronym = roleWords.length > 1
      ? roleWords.map(w => w[0]?.toUpperCase()).join('')
      : approver.roleTitle.substring(0, 10).toUpperCase();
      
    const nameSize = 7; const roleSize = 6;
    const nameWidth = fontBold.widthOfTextAtSize(firstName, nameSize);
    const roleWidth = fontRegular.widthOfTextAtSize(roleAcronym, roleSize);
    
    page.drawText(firstName, { x: x + (DESIGN_STAMP_W - nameWidth) / 2, y: y + 10, size: nameSize, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(roleAcronym, { x: x + (DESIGN_STAMP_W - roleWidth) / 2, y: y + 3, size: roleSize, font: fontRegular, color: rgb(0, 0, 0) });
    
    return { width: DESIGN_STAMP_W, height: DESIGN_STAMP_H };
  } else {
    const STAMP_W = 130; const STAMP_H = 65;
    page.drawRectangle({ x, y, width: STAMP_W, height: STAMP_H, color: rgb(1, 1, 1), opacity: 1.0, borderColor: rgb(0.3, 0.3, 0.3), borderOpacity: 1.0, borderWidth: 1 });
    
    const sigDims = signatureImage.scale(1.0);
    const aspect = sigDims.width / Math.max(1, sigDims.height);
    const maxSigW = STAMP_W - 10; const maxSigH = 30;
    let sigW = maxSigW; let sigH = sigW / aspect;
    if (sigH > maxSigH) { sigH = maxSigH; sigW = sigH * aspect; }
    
    page.drawImage(signatureImage, { x: x + (STAMP_W - sigW) / 2, y: y + STAMP_H - sigH - 4, width: sigW, height: sigH });
    page.drawText(approver.userName, { x: x + 6, y: y + 24, size: 8, font: fontBold, color: rgb(0, 0, 0) });
    
    const shortRole = approver.roleTitle.length > 25 ? approver.roleTitle.substring(0, 23) + '...' : approver.roleTitle;
    page.drawText(shortRole, { x: x + 6, y: y + 14, size: 6, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    
    const dateStr = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    page.drawText(`Disetujui: ${dateStr}`, { x: x + 6, y: y + 5, size: 5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(requestId, { x: x + STAMP_W - 40, y: y + 5, size: 4, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });
    
    return { width: STAMP_W, height: STAMP_H };
  }
}

export async function executeOneClickAutoSign(
  pdfSource: string | ArrayBuffer, signaturePngDataUrl: string, currentApprover: ApproverStep, allSteps: ApproverStep[],
  category: 'Design' | 'WO Existing' = 'Design', selectedPages: number[] = [], requestId: string = 'REQ-0000',
  docType: 'WO' | 'PR' | 'PO' = 'WO', forceNewPage: boolean = false, customYOffset?: number
): Promise<AutoSignResult> {
  try {
    let pdfBytes: Uint8Array;
    if (typeof pdfSource === 'string') {
      if (pdfSource.startsWith('data:')) {
        const base64Data = pdfSource.split(',')[1];
        const binaryString = atob(base64Data);
        pdfBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) pdfBytes[i] = binaryString.charCodeAt(i);
      } else {
        const cacheBusterUrl = pdfSource.includes('?') ? `${pdfSource}&t=${Date.now()}` : `${pdfSource}?t=${Date.now()}`;
        const response = await fetch(cacheBusterUrl);
        pdfBytes = new Uint8Array(await response.arrayBuffer());
      }
    } else { 
      pdfBytes = new Uint8Array(pdfSource); 
    }

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let signatureBytes: Uint8Array;
    if (signaturePngDataUrl.startsWith('data:image/')) {
      const base64Png = signaturePngDataUrl.split(',')[1];
      const binaryPng = atob(base64Png);
      signatureBytes = new Uint8Array(binaryPng.length);
      for (let i = 0; i < binaryPng.length; i++) signatureBytes[i] = binaryPng.charCodeAt(i);
    } else throw new Error('Format tanda tangan harus berupa Data URL PNG transparan.');
    
    const embeddedSignature = await pdfDoc.embedPng(signatureBytes);
    const signedPagesList: number[] = [];
    let lastFittedCoords = { x: 0, y: 0, width: 0, height: 0 };
    let totalSigned = 0;

    if (category === 'WO Existing') {
      const STAMP_W = 130; const STAMP_H = 65;
      const GAP_X = 10; const GAP_Y = 15;
      const marginRight = 40;

      const realIndex = allSteps.findIndex(s => s.id === currentApprover.id);
      const safeIndex = realIndex === -1 ? 0 : realIndex;
      
      const row = Math.floor(safeIndex / 4);
      const col = safeIndex % 4;
      
      const totalCols = Math.min(allSteps.length, 4);
      const totalBlockWidth = (totalCols * STAMP_W) + ((totalCols - 1) * GAP_X);

      let pagesToSign = selectedPages.length > 0 ? selectedPages : pdfDoc.getPages().map((_, i) => i + 1);

      if (forceNewPage) {
        if (safeIndex === 0) {
          const refPage = pdfDoc.getPages()[0];
          const { width, height } = refPage.getSize();
          pdfDoc.addPage([width, height]);
        }
        pagesToSign = [pdfDoc.getPages().length];
      }

      for (const pageNum of pagesToSign) {
        const docPages = pdfDoc.getPages();
        if (pageNum < 1 || pageNum > docPages.length) continue;
        let targetPage = docPages[pageNum - 1];
        
        const { width: pageWidth, height: pageHeight } = targetPage.getSize();
        
        let baseY = customYOffset !== undefined ? customYOffset : 180;
        if (forceNewPage) baseY = pageHeight - 100;
        
        const startX = pageWidth - marginRight - totalBlockWidth;
        const x = startX + (col * (STAMP_W + GAP_X));
        const y = baseY - (row * (STAMP_H + GAP_Y));

        const dims = drawDigitalStamp(targetPage, embeddedSignature, currentApprover, requestId, x, y, fontRegular, fontBold, category);
        
        if (!signedPagesList.includes(pageNum)) signedPagesList.push(pageNum);
        lastFittedCoords = { x, y, width: dims.width, height: dims.height };
        totalSigned++;
      }
    } else {
      const DESIGN_STAMP_W = 55; const DESIGN_STAMP_H = 45; const GAP = -18;
      const rightMargin = 28; const bottomMargin = 75;
      const rawTargetSlots: DetectedSlot[] = [];
      const pages = pdfDoc.getPages();
      let lastPageIndex = pages.length - 1;

      if (currentApprover.detectedSlots && currentApprover.detectedSlots.length > 0) {
        rawTargetSlots.push(...currentApprover.detectedSlots);
      } else if (currentApprover.detectedSlot) {
        rawTargetSlots.push(currentApprover.detectedSlot);
      } else {
        const approverIndex = allSteps.findIndex(s => s.id === currentApprover.id);
        const safeIndex = Math.min(Math.max(0, approverIndex), 1);
        const pagesToStamp = selectedPages.length > 0 ? selectedPages : [lastPageIndex + 1];
        
        pagesToStamp.forEach(pageNum => {
          const targetPage = pages[pageNum - 1];
          const { width: pageWidth } = targetPage.getSize();
          const startX = pageWidth - rightMargin - (2 * DESIGN_STAMP_W);
          const boxX = startX + (safeIndex * (DESIGN_STAMP_W + GAP));
          const boxY = bottomMargin;
          rawTargetSlots.push({
            pageIndex: pageNum - 1, pageNumber: pageNum, slotType: 'authorization_box',
            isFooter: true, hasExplicitBox: false, slotLabel: `Posisi Default Design`,
            x: boxX, y: boxY, width: DESIGN_STAMP_W, height: DESIGN_STAMP_H,
            name: currentApprover.userName, role: currentApprover.roleTitle, confidence: 'layout_matrix',
          });
        });
      }
      
      for (const slot of rawTargetSlots) {
        const pageIndex = Math.min(Math.max(0, slot.pageIndex || 0), pages.length - 1);
        const targetPage = pages[pageIndex];
        const safeX = typeof slot.x === 'number' ? slot.x : 40;
        const safeY = typeof slot.y === 'number' ? slot.y : 40;
        const dims = drawDigitalStamp(targetPage, embeddedSignature, currentApprover, requestId, safeX, safeY, fontRegular, fontBold, category);
        const pNum = pageIndex + 1;
        if (!signedPagesList.includes(pNum)) signedPagesList.push(pNum);
        lastFittedCoords = { x: safeX, y: safeY, width: dims.width, height: dims.height };
        totalSigned++;
      }
    }

    signedPagesList.sort((a, b) => a - b);
    const modifiedBytes = await pdfDoc.save();
    const blob = new Blob([modifiedBytes as unknown as BlobPart], { type: 'application/pdf' });
    const signedPdfUrl = URL.createObjectURL(blob);

    return {
      success: true, signedPdfUrl, signedAt: new Date().toISOString(), detectedPage: signedPagesList[0] || (pdfDoc.getPages().length), signedPages: signedPagesList,
      totalSlotsSigned: totalSigned, coordinates: lastFittedCoords, detectionMethod: 'dynamic_margin_shift', auditStamp: 'Stamp Card Digital'
    };
  } catch (error: any) {
    return {
      success: false, signedPdfUrl: '', signedAt: '', detectedPage: 1, signedPages: [],
      totalSlotsSigned: 0, coordinates: { x: 0, y: 0, width: 0, height: 0 },
      detectionMethod: 'layout_slot_matched', auditStamp: '', error: error?.message || 'Gagal menandatangani.'
    };
  }
}