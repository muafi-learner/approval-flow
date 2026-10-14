import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ApproverSlot {
  name: string;
  role: string;
  order: number;
}

/**
 * Creates an authentic corporate multi-page PDF approval document.
 * Supports:
 * 1. "WI Produksi Base dan Premix" (Instruksi Kerja Mutu & Batch Produksi)
 * 2. "Persetujuan Desain & Pembukaan Cabang Kintoun Suhat Malang" (Approval Desain & Gerai)
 * 3. General corporate approval requests
 */
export async function createSampleApprovalPdf(
  title: string,
  approvers: ApproverSlot[]
): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const isWiProduksi =
    title.toLowerCase().includes('wi') ||
    title.toLowerCase().includes('produksi') ||
    title.toLowerCase().includes('premix') ||
    title.toLowerCase().includes('base');

  const refNumber = isWiProduksi
    ? 'WI/PRD-BASE/2026/042'
    : 'DES-MLG/BRN/2026/018';

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ================= PAGE 1: RINGKASAN & RUANG LINGKUP =================
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page1.getSize();

  // Top header bar
  page1.drawRectangle({
    x: 40,
    y: height - 52,
    width: width - 80,
    height: 3,
    color: rgb(0.09, 0.12, 0.18),
  });

  page1.drawText(
    isWiProduksi
      ? 'INSTRUKSI KERJA RESMI (STANDARD WORK INSTRUCTION)'
      : 'MEMORANDUM PERSETUJUAN RESMI (APPROVAL MEMORANDUM)',
    {
      x: 40,
      y: height - 44,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    }
  );

  page1.drawText(`No. Dokumen: ${refNumber}`, {
    x: width - 210,
    y: height - 44,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  });

  // Main Title
  page1.drawText(title.toUpperCase(), {
    x: 40,
    y: height - 88,
    size: 14,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText(`Tanggal Pengesahan: ${dateStr}`, {
    x: 40,
    y: height - 108,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  page1.drawText(
    isWiProduksi
      ? 'Klasifikasi: Standar Operasional Mutu & Formulasi Produksi (Terkendali)'
      : 'Klasifikasi: Dokumen Otorisasi Perencanaan & Eksekusi Proyek',
    {
      x: 40,
      y: height - 122,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.35, 0.45),
    }
  );

  page1.drawLine({
    start: { x: 40, y: height - 134 },
    end: { x: width - 40, y: height - 134 },
    thickness: 0.5,
    color: rgb(0.8, 0.82, 0.86),
  });

  // Section 1
  page1.drawText(
    isWiProduksi
      ? '1. Latar Belakang & Ruang Lingkup Standar Mutu'
      : '1. Ringkasan Eksekutif & Latar Belakang Pembukaan Cabang',
    {
      x: 40,
      y: height - 160,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    }
  );

  const p1Content = isWiProduksi
    ? [
        'Dokumen Instruksi Kerja (WI) ini mengatur secara ketat seluruh tahapan operasional pembuatan formulasi base',
        'dan pencampuran premix bumbu. Tujuan dari instruksi kerja ini adalah untuk memastikan konsistensi rasa, mutu,',
        'higienitas, dan pemenuhan regulasi keamanan pangan pada setiap batch produksi.',
        '',
        'Ruang lingkup dokumen mencakup:',
        '• Pemeriksaan fisik dan sertifikat analisis (COA) seluruh bahan baku yang masuk ke area blending.',
        '• Penyiapan lingkungan kerja steril, pembersihan mesin, dan kepatuhan Good Manufacturing Practice (GMP).',
        '• Prosedur batch sheet penimbangan, rasio pencampuran base, dan pengendalian deviasi suhu mesin mixing.',
        '• Validasi mutu akhir oleh tim Quality Assurance sebelum produk didistribusikan ke seluruh gerai cabang.',
      ]
    : [
        'Dokumen ini memuat usulan persetujuan master design, denah interior, dan visual signage gerai baru Kintoun di',
        'kawasan strategis Jl. Soekarno-Hatta (Suhat), Malang, Jawa Timur.',
        '',
        'Tujuan dan ruang lingkup permohonan:',
        '• Otorisasi desain arsitektur interior berkonsep modern Japanese dining dengan kapasitas 84 seat.',
        '• Standarisasi alur kitchen display system, dapur operasional, dan jalur sirkulasi tamu.',
        '• Penerapan identitas fasad toko, neon flex signage, dan pemilihan material ramah lingkungan.',
        '• Persetujuan alokasi anggaran fit-out serta jadwal konstruksi tahap 1 sebelum grand opening.',
      ];

  let p1Y = height - 180;
  for (const line of p1Content) {
    if (line.trim() === '') {
      p1Y -= 8;
      continue;
    }
    const isSubHeader = line.startsWith('Ruang') || line.startsWith('Tujuan');
    page1.drawText(line, {
      x: 40,
      y: p1Y,
      size: 9,
      font: isSubHeader ? fontBold : fontRegular,
      color: rgb(0.2, 0.25, 0.35),
    });
    p1Y -= 15;
  }

  // ================= TABEL FOOTER: RIWAYAT REVISI & OTORISASI MUTU =================
  // Official corporate footer positioned neatly at the bottom margin (Y: 46 to 134 pt)
  const footerTableBottomY = 46;
  const footerHeaderHeight = 22;
  const footerRowHeight = 66;
  const footerTotalTableHeight = footerHeaderHeight + footerRowHeight; // 88 pt
  const footerTableTopY = footerTableBottomY + footerTotalTableHeight; // 134 pt
  const tableX = 40;
  const tableWidth = width - 80; // 515.28 pt

  // Separator line and label above Footer
  page1.drawLine({
    start: { x: tableX, y: footerTableTopY + 16 },
    end: { x: tableX + tableWidth, y: footerTableTopY + 16 },
    thickness: 0.6,
    color: rgb(0.82, 0.85, 0.9),
  });

  page1.drawText('RIWAYAT REVISI & OTORISASI PENGESAHAN DOKUMEN (FOOTER RESMI)', {
    x: tableX,
    y: footerTableTopY + 22,
    size: 7.5,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });

  // Background of footer table
  page1.drawRectangle({
    x: tableX,
    y: footerTableBottomY,
    width: tableWidth,
    height: footerTotalTableHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.72, 0.76, 0.83),
    borderWidth: 1,
  });

  // Header row background
  page1.drawRectangle({
    x: tableX,
    y: footerTableTopY - footerHeaderHeight,
    width: tableWidth,
    height: footerHeaderHeight,
    color: rgb(0.92, 0.94, 0.97),
  });

  // Column widths:
  // Tanggal: 75pt, Uraian: 170pt, Mengajukan: 90pt, Mengetahui: 90pt, Menyetujui: 90.28pt
  const col1W = 75;
  const col2W = 170;
  const col3W = 90;
  const col4W = 90;
  const col5W = tableWidth - col1W - col2W - col3W - col4W; // ~90.28pt

  const col1X = tableX;
  const col2X = col1X + col1W;
  const col3X = col2X + col2W;
  const col4X = col3X + col3W;
  const col5X = col4X + col4W;

  // Vertical column dividers
  [col2X, col3X, col4X, col5X].forEach(divX => {
    page1.drawLine({
      start: { x: divX, y: footerTableTopY },
      end: { x: divX, y: footerTableBottomY },
      thickness: 0.8,
      color: rgb(0.76, 0.8, 0.86),
    });
  });

  // Horizontal divider between header and data row
  page1.drawLine({
    start: { x: tableX, y: footerTableTopY - footerHeaderHeight },
    end: { x: tableX + tableWidth, y: footerTableTopY - footerHeaderHeight },
    thickness: 1,
    color: rgb(0.72, 0.76, 0.83),
  });

  // Header Texts
  const headerY = footerTableTopY - 15;
  page1.drawText('Tanggal', { x: col1X + 16, y: headerY, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page1.drawText('Uraian Perubahan', { x: col2X + 14, y: headerY, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page1.drawText('Mengajukan', { x: col3X + 18, y: headerY, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page1.drawText('Mengetahui', { x: col4X + 18, y: headerY, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page1.drawText('Menyetujui', { x: col5X + 18, y: headerY, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });

  // Row 1 Content:
  // Tanggal
  page1.drawText('12/10/2026', {
    x: col1X + 12,
    y: footerTableBottomY + 30,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Uraian Perubahan
  const descLines = isWiProduksi
    ? [
        'Formulasi Premix Mutu Baru,',
        'toleransi deviasi suhu mixing (±2°C),',
        'dan standar uji organoleptik batch.',
      ]
    : [
        'Master desain interior gerai Suhat,',
        'kapasitas 84 seat & kitchen flow,',
        'spesifikasi material fasad ramah ling.',
      ];

  let descY = footerTableTopY - footerHeaderHeight - 16;
  descLines.forEach(dl => {
    page1.drawText(dl, {
      x: col2X + 8,
      y: descY,
      size: 7.8,
      font: fontRegular,
      color: rgb(0.25, 0.3, 0.4),
    });
    descY -= 13;
  });

  // Approver identities for the table columns
  const p1Mengajukan = isWiProduksi ? { name: 'Nada', role: 'Pengaju / QA' } : { name: 'Billie', role: 'Design Lead' };
  const p1Mengetahui = isWiProduksi ? { name: 'Fitrah', role: 'GM Operations' } : { name: 'Lily', role: 'Head of Design' };
  const p1Menyetujui = isWiProduksi ? { name: 'Ivan', role: 'Direktur Operasional' } : { name: 'Anton', role: 'CEO' };

  // Helper to draw signature box cell with bottom name tag
  const drawSignatureCell = (
    cellLeft: number,
    cellW: number,
    appr: { name: string; role: string }
  ) => {
    // Inner box guideline strictly inside the cell:
    // Footer table bottom: footerTableBottomY = 46
    // Name label: y = 52 (height ~10)
    // Safe inner box: y = 64 to 106 (height: 42 pt)
    // Header divider: y = 112
    const boxInnerX = cellLeft + 6;
    const boxInnerY = footerTableBottomY + 18; // 64 pt
    const boxInnerW = cellW - 12; // 78 pt
    const boxInnerH = footerRowHeight - 24; // 42 pt

    page1.drawRectangle({
      x: boxInnerX,
      y: boxInnerY,
      width: boxInnerW,
      height: boxInnerH,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 0.6,
    });

    // Name label at bottom of cell
    const nameStr = `(${appr.name})`;
    const nameW = fontBold.widthOfTextAtSize(nameStr, 8);
    page1.drawText(nameStr, {
      x: cellLeft + Math.max(4, (cellW - nameW) / 2),
      y: footerTableBottomY + 6,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });
  };

  drawSignatureCell(col3X, col3W, p1Mengajukan);
  drawSignatureCell(col4X, col4W, p1Mengetahui);
  drawSignatureCell(col5X, col5W, p1Menyetujui);

  page1.drawText('Halaman 1 dari 4 · Dokumen Resmi Terkendali (Pengesahan Footer Aktif)', {
    x: 40,
    y: 28,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  // ================= PAGE 2: SPESIFIKASI PROSES / DESAIN =================
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  page2.drawRectangle({
    x: 40,
    y: height - 52,
    width: width - 80,
    height: 3,
    color: rgb(0.09, 0.12, 0.18),
  });

  page2.drawText(
    isWiProduksi
      ? 'LAMPIRAN I: TAHAPAN OPERASIONAL & PENGOLAHAN'
      : 'LAMPIRAN I: DENAH LAYOUT & DESAIN INTERIOR GERAI',
    {
      x: 40,
      y: height - 44,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    }
  );

  page2.drawText(refNumber, {
    x: width - 180,
    y: height - 44,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  });

  page2.drawText(
    isWiProduksi
      ? 'STANDAR PENGOLAHAN BASE & TITIK KRITIS SUHU MIXING'
      : 'SPESIFIKASI RUANG, DENAH KURSI, DAN SIRKULASI OPERASIONAL',
    {
      x: 40,
      y: height - 88,
      size: 13,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    }
  );

  page2.drawLine({
    start: { x: 40, y: height - 102 },
    end: { x: width - 40, y: height - 102 },
    thickness: 0.5,
    color: rgb(0.8, 0.82, 0.86),
  });

  const p2Content = isWiProduksi
    ? [
        '1. Penimbangan & Verifikasi Bahan Baku',
        '• Bahan dasar harus ditimbang menggunakan timbangan digital bersertifikasi kalibrasi aktif.',
        '• Seluruh operator wajib mencatat nomor batch dan tanggal kedaluwarsa pada lembar formulir batch sheet.',
        '• Toleransi deviasi berat penimbangan bahan baku utama tidak boleh melebihi ±0.05 kg.',
        '',
        '2. Prosedur Homogenisasi & Pengadukan (Mixing)',
        '• Mesin mixer dibersihkan sesuai standar Clean-In-Place (CIP) sebelum memulai batch baru.',
        '• Kecepatan mixing tahap awal disetel pada 450 RPM selama 8 menit untuk pelarutan merata.',
        '• Kecepatan mixing tahap kedua dinaikkan ke 1,200 RPM dengan durasi 15 menit.',
        '• Suhu operasional bejana mixing harus dijaga ketat pada rentang 65°C hingga 70°C.',
        '',
        '3. Penyaringan & Pemindahan ke Tangki Penampung',
        '• Produk wajib melewati filter stainless steel mesh 80 sebelum dialirkan ke holding tank.',
        '• Lakukan visual inspection terhadap kemungkinan gumpalan atau kontaminan fisik.',
      ]
    : [
        '1. Zonasi & Kapasitas Gerai Kintoun Suhat',
        '• Area Makan Utama (Dining Hall): 52 kursi dengan meja kayu oak natural dan partisi kisi-kisi bambu.',
        '• Area Semi-Private Room: 2 ruangan (masing-masing 16 kursi) untuk pertemuan keluarga/bisnis.',
        '• Area Kasir & Pick-up: Meja terrazzo putih dengan integrasi POS dual-screen dan mesin EDC.',
        '',
        '2. Dapur Operasional & Kitchen Flow',
        '• Alur kerja satu arah (One-Way Workflow): Penyimpanan bahan -> Preparation -> Cooking line -> Plating.',
        '• Saluran pembuangan grease trap stainless steel di bawah setiap sink cuci piring.',
        '• Sistem exhaust hood kapasitas 4,500 CFM dengan peredam kebisingan maksimal 58 dB.',
        '',
        '3. Pencahayaan & Akustik',
        '• Temperatur warna cahaya: 3,000 Kelvin (Warm White) untuk menciptakan atmosfer hangat dan elegan.',
        '• Panel akustik tersembunyi pada plafon untuk meredam dengung suara hingga 40%.',
      ];

  let p2Y = height - 128;
  for (const line of p2Content) {
    if (line.trim() === '') {
      p2Y -= 8;
      continue;
    }
    const isSectionHeader = /^\d+\./.test(line);
    page2.drawText(line, {
      x: 40,
      y: p2Y,
      size: isSectionHeader ? 10.5 : 9,
      font: isSectionHeader ? fontBold : fontRegular,
      color: isSectionHeader ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.25, 0.35),
    });
    p2Y -= 16;
  }

  page2.drawText('Halaman 2 dari 4 · Prosedur Operasional & Spesifikasi', {
    x: 40,
    y: 32,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  // ================= PAGE 3: KONTROL KUALITAS / SIGNAGE TOKO =================
  const page3 = pdfDoc.addPage([595.28, 841.89]);

  page3.drawRectangle({
    x: 40,
    y: height - 52,
    width: width - 80,
    height: 3,
    color: rgb(0.09, 0.12, 0.18),
  });

  page3.drawText(
    isWiProduksi
      ? 'LAMPIRAN II: KONTROL KUALITAS LABORATORIUM & FORMULASI PREMIX'
      : 'LAMPIRAN II: FASAD, SIGNAGE & STANDAR IDENTITAS VISUAL',
    {
      x: 40,
      y: height - 44,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    }
  );

  page3.drawText(refNumber, {
    x: width - 180,
    y: height - 44,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  });

  page3.drawText(
    isWiProduksi
      ? 'FORMULASI PREMIX KHUSUS, UJI ORGANOLEPTIK & BATAS DEVASI'
      : 'SPESIFIKASI FASAD, NEON FLEX SIGNAGE & TOKEN MATERIAL BRANDING',
    {
      x: 40,
      y: height - 88,
      size: 13,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    }
  );

  page3.drawLine({
    start: { x: 40, y: height - 102 },
    end: { x: width - 40, y: height - 102 },
    thickness: 0.5,
    color: rgb(0.8, 0.82, 0.86),
  });

  const p3Content = isWiProduksi
    ? [
        '1. Komposisi & Rasio Formulasi Premix Kering',
        '• Rasio campuran Premix Komponen A : Komponen B ditetapkan tepat 3 : 1 berdasarkan resep resmi R&D.',
        '• Bahan pembawa (carrier matrix) harus memiliki kadar air (moisture content) maksimal 4.5%.',
        '• Waktu pengadukan premix kering dilakukan selama 20 menit dalam dry-blender putaran lambat.',
        '',
        '2. Parameter Uji Laboratorium dan Batas Deviasi Mutu',
        '• Pengukuran derajat keasaman (pH) larutan uji: Standar mutu 6.2 – 6.6 (deviasi toleransi ±0.1).',
        '• Uji viskositas larutan pada suhu 25°C: Standar 380 cP (rentang toleransi 350 – 420 cP).',
        '• Toleransi deviasi suhu mixing premix wajib dikendalikan pada rentang toleransi ±2°C.',
        '',
        '3. Pengujian Sensori Organoleptik Setiap Batch',
        '• Tim QC wajib melakukan uji cicip organoleptik aroma, rasa umami, kekentalan, dan warna larutan.',
        '• Batch yang tidak memenuhi standar organoleptik langsung diberi label KARANTINA dan diisolasi.',
        '• Sampel pertinggal (retain sample) disimpan di ruang suhu terkontrol selama 12 bulan.',
      ]
    : [
        '1. Fasad Utama & Signage Eksterior',
        '• Huruf timbul KINTOUN berbahan acrylic milky white tebal 15mm dengan backlight LED warm white.',
        '• Cladding fasad menggunakan Aluminium Composite Panel (ACP) warna charcoal matte tahan cuaca.',
        '• Papan penanda totem gerai setinggi 4.5 meter di pinggir jalan dengan logo lambang Kintoun.',
        '',
        '2. Material Finishing & Perlengkapan Interior',
        '• Lantai: Homogeneous Tile 60x60cm bertekstur anti-slip (R10) warna abu-abu semen ekspos.',
        '• Dinding: Cat ramah lingkungan low-VOC warna warm grey dipadukan aksen panel kayu jati belanda.',
        '• Furniture: Meja rangka besi hollow finishing powder coat hitam doff dengan top table kayu solid.',
        '',
        '3. Standarisasi Visual Brand Identity',
        '• Penempatan poster menu promo seragam dalam frame magnetik akrilik ukuran A2.',
        '• Seragam staf front-of-house dan back-of-house mengacu pada panduan brandbook Kintoun 2026.',
      ];

  let p3Y = height - 128;
  for (const line of p3Content) {
    if (line.trim() === '') {
      p3Y -= 8;
      continue;
    }
    const isSectionHeader = /^\d+\./.test(line);
    page3.drawText(line, {
      x: 40,
      y: p3Y,
      size: isSectionHeader ? 10.5 : 9,
      font: isSectionHeader ? fontBold : fontRegular,
      color: isSectionHeader ? rgb(0.1, 0.15, 0.25) : rgb(0.2, 0.25, 0.35),
    });
    p3Y -= 16;
  }

  // Footer label
  page3.drawText('Halaman 3 dari 4 · Kontrol Mutu & Spesifikasi Detail (Lembar Tinjauan Revisi)', {
    x: 40,
    y: 32,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  // ================= PAGE 4: LEMBAR OTORISASI & TANDA TANGAN =================
  const page4 = pdfDoc.addPage([595.28, 841.89]);

  page4.drawRectangle({
    x: 40,
    y: height - 52,
    width: width - 80,
    height: 3,
    color: rgb(0.09, 0.12, 0.18),
  });

  page4.drawText('LEMBAR PENGESAHAN RESMI (SIGNATURE SHEET)', {
    x: 40,
    y: height - 44,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });

  page4.drawText(refNumber, {
    x: width - 180,
    y: height - 44,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.5),
  });

  page4.drawText('LEMBAR OTORISASI & MATRIKS TANDA TANGAN BERJENJANG', {
    x: 40,
    y: height - 88,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  page4.drawLine({
    start: { x: 40, y: height - 102 },
    end: { x: width - 40, y: height - 102 },
    thickness: 0.5,
    color: rgb(0.8, 0.82, 0.86),
  });

  let p4Y = height - 124;
  page4.drawText('Alur Pengesahan Berjenjang (Sequential Approval Pipeline):', {
    x: 40,
    y: p4Y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  p4Y -= 16;
  const flowText = approvers.map(a => `${a.name} (${a.role})`).join('  ->  ');
  page4.drawText(flowText, {
    x: 40,
    y: p4Y,
    size: 8.5,
    font: fontOblique,
    color: rgb(0.2, 0.3, 0.5),
  });

  p4Y -= 32;
  page4.drawText('Matriks Tanda Tangan Pihak Penanggung Jawab:', {
    x: 40,
    y: p4Y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  // Calculate box layout for approvers:
  const marginX = 40;
  const availableWidth = width - marginX * 2;
  const numApprovers = approvers.length;

  const cols = numApprovers <= 4 ? numApprovers : 3;
  const boxWidth = (availableWidth - (cols - 1) * 12) / cols;
  const boxHeight = numApprovers > 4 ? 92 : 110;
  const rowSpacing = numApprovers > 4 ? 18 : 25;

  const startBoxY = p4Y - 20;

  approvers.forEach((appr, idx) => {
    const colIdx = idx % cols;
    const rowIdx = Math.floor(idx / cols);
    const boxX = marginX + colIdx * (boxWidth + 12);
    const boxY = startBoxY - rowIdx * (boxHeight + rowSpacing) - boxHeight;

    // Draw Signature Box outline
    page4.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0.78, 0.82, 0.88),
      borderWidth: 1,
      color: rgb(0.98, 0.99, 1.0),
    });

    // Header role title inside box
    const headerHeight = numApprovers > 4 ? 20 : 22;
    page4.drawRectangle({
      x: boxX,
      y: boxY + boxHeight - headerHeight,
      width: boxWidth,
      height: headerHeight,
      color: rgb(0.92, 0.94, 0.97),
    });

    const roleFontSize = numApprovers > 4 ? 8 : 8.5;
    const roleWidth = fontBold.widthOfTextAtSize(appr.role, roleFontSize);
    page4.drawText(appr.role, {
      x: boxX + Math.max(4, (boxWidth - roleWidth) / 2),
      y: boxY + boxHeight - (numApprovers > 4 ? 14 : 16),
      size: roleFontSize,
      font: fontBold,
      color: rgb(0.2, 0.25, 0.35),
    });

    // Signature Area Placeholder Line
    const lineY = numApprovers > 4 ? 24 : 28;
    page4.drawLine({
      start: { x: boxX + 12, y: boxY + lineY },
      end: { x: boxX + boxWidth - 12, y: boxY + lineY },
      thickness: 0.5,
      color: rgb(0.7, 0.75, 0.8),
    });

    // Approver Name Label - Center aligned
    const nameFontSize = numApprovers > 4 ? 9 : 10;
    const nameWidth = fontBold.widthOfTextAtSize(appr.name, nameFontSize);
    page4.drawText(appr.name, {
      x: boxX + (boxWidth - nameWidth) / 2,
      y: boxY + (numApprovers > 4 ? 10 : 12),
      size: nameFontSize,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.18),
    });
  });

  // Footer note
  page4.drawText('Halaman 4 dari 4 · Lembar Otorisasi Resmi Berjenjang', {
    x: 40,
    y: 32,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}
