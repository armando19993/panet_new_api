import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as QRCode from 'qrcode';
import { fromPath } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';

const normalizePhone = (phone?: string | null) => {
  if (!phone) {
    return 'N/A';
  }
  return phone.startsWith('+') ? phone : `+${phone}`;
};

const formatInstrumentType = (type?: string | null) => {
  if (!type) {
    return 'N/A';
  }
  return type
    .toLowerCase()
    .split('_')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatAmount = (amount: any, currency?: string | null) => {
  if (amount === null || amount === undefined) {
    return 'N/A';
  }

  const numericAmount = Number(amount);
  const sanitizedCurrency = currency || 'VES';

  if (!Number.isNaN(numericAmount)) {
    try {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: sanitizedCurrency,
      }).format(numericAmount);
    } catch {
      return `${numericAmount.toFixed(2)} ${sanitizedCurrency}`.trim();
    }
  }

  return `${amount} ${sanitizedCurrency}`.trim();
};

const buildValidationCode = (transaction: any) => {
  const paddedId = String(transaction.publicId ?? '').padStart(4, '0');
  const reference = String(transaction.nro_referencia ?? '').slice(-4).padStart(4, '0');
  return `CON${paddedId}${reference}`.toUpperCase();
};

export const generateTransactionImage = async (transaction: any, logoDataUri?: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const horizontalMargin = 15;
  let currentY = 20;

  const preferredContact = transaction.cliente || transaction.creador || {};
  const fallbackContact = transaction.creador || {};
  const contactName = preferredContact.name || fallbackContact.name || 'N/A';
  const contactPhone = normalizePhone(preferredContact.phone || fallbackContact.phone);
  const contactEmail = preferredContact.email || fallbackContact.email || 'N/A';

  const instrument = transaction.instrument || {};
  const bankName = instrument.bank?.name || 'N/A';
  const instrumentType = formatInstrumentType(instrument.typeInstrument);
  const instrumentHolder = instrument.holder || 'N/A';
  const instrumentDocument = instrument.document || 'N/A';
  const instrumentAccount = instrument.accountNumber || 'N/A';
  const currency = transaction.destino?.currency || 'VES';
  const formattedAmount = formatAmount(transaction.montoDestino, currency);
  const validationCode = buildValidationCode(transaction);
  const transactionNumber = `TRX-${new Date().getFullYear()}-${transaction.publicId}`;
  const emissionDate = new Date(transaction.createdAt).toLocaleString('es-VE');

  if (logoDataUri) {
    const logoHeight = 22;
    const logoWidth = 60;
    doc.addImage(logoDataUri, 'PNG', (pageWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
    currentY += logoHeight + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CONECTA CONSULTING C.A.', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('RIF: J-50748041-0', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.text('+58 0414-8383419', pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('COMPROBANTE DE PAGO', pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Comprobante N°: ${transactionNumber}`, horizontalMargin, currentY);
  doc.text(`Estado: ${transaction.status || 'N/A'}`, pageWidth - horizontalMargin, currentY, { align: 'right' });
  currentY += 5;

  doc.text(`Fecha / Hora emisión: ${emissionDate}`, horizontalMargin, currentY);
  currentY += 8;

  doc.setDrawColor(200);
  doc.roundedRect(horizontalMargin, currentY, pageWidth - horizontalMargin * 2, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total pagado', horizontalMargin + 6, currentY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Moneda: ${currency}`, horizontalMargin + 6, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(formattedAmount, pageWidth - horizontalMargin - 6, currentY + 13, { align: 'right' });
  currentY += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Datos del cliente', horizontalMargin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${contactName}`, horizontalMargin, currentY);
  currentY += 5;
  doc.text(`Teléfono: ${contactPhone}`, horizontalMargin, currentY);
  currentY += 5;
  doc.text(`Correo: ${contactEmail}`, horizontalMargin, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Detalles del pago', horizontalMargin, currentY);
  currentY += 6;

  autoTable(doc, {
    startY: currentY,
    body: [
      ['Método', instrumentType],
      ['Titular', instrumentHolder],
      ['Documento', instrumentDocument],
      ['Cuenta / ID', instrumentAccount],
      ['Banco', bankName],
      ['Referencia', transaction.nro_referencia || 'N/A'],
    ],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 },
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: pageWidth - horizontalMargin * 2 - 40 },
    },
    margin: { left: horizontalMargin, right: horizontalMargin },
  });

  currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Observación', horizontalMargin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const observation = transaction.observacion || 'Pago por soporte mensual. Exento de IVA.';
  const splitObservation = doc.splitTextToSize(observation, pageWidth - horizontalMargin * 2);
  doc.text(splitObservation, horizontalMargin, currentY);
  currentY += splitObservation.length * 5 + 4;

  const qrPayload = JSON.stringify({
    transaction: transactionNumber,
    amount: transaction.montoDestino,
    currency,
    reference: transaction.nro_referencia || 'N/A',
    validationCode,
  });

  // Generar QR code con manejo de errores
  let qrDataUri: string;
  try {
    // Verificar que QRCode esté disponible y tenga el método toDataURL
    console.log('🔍 [ImageGenerator] Verificando QRCode:', {
      qrCodeExiste: !!QRCode,
      tipoQRCode: typeof QRCode,
      tieneToDataURL: QRCode ? typeof (QRCode as any).toDataURL === 'function' : false,
      keysQRCode: QRCode ? Object.keys(QRCode) : [],
    });

    if (!QRCode) {
      throw new Error('QRCode no está disponible (undefined)');
    }

    // Intentar diferentes formas de acceder al método
    const qrToDataURL = (QRCode as any).toDataURL || (QRCode as any).default?.toDataURL;

    if (!qrToDataURL || typeof qrToDataURL !== 'function') {
      throw new Error('QRCode.toDataURL no está disponible. Tipo: ' + typeof QRCode);
    }

    qrDataUri = await qrToDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 0 });
    console.log('✅ [ImageGenerator] QR code generado exitosamente');
  } catch (qrError) {
    console.error('❌ [ImageGenerator] Error al generar QR code:', {
      error: qrError instanceof Error ? qrError.message : 'Error desconocido',
      stack: qrError instanceof Error ? qrError.stack : undefined,
      qrPayload: qrPayload,
      qrCodeType: typeof QRCode,
      qrCodeKeys: QRCode ? Object.keys(QRCode) : [],
    });
    // Crear un placeholder simple si falla la generación del QR
    qrDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
  const qrSize = 40;
  doc.addImage(qrDataUri, 'PNG', (pageWidth - qrSize) / 2, currentY, qrSize, qrSize);
  currentY += qrSize + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Código de validación: ${validationCode}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Escanea el código QR para validar el comprobante.', pageWidth / 2, currentY, { align: 'center' });
  currentY += 20;

  doc.setFontSize(8);
  doc.text('CONECTA – Soluciones Financieras', pageWidth / 2, pageHeight - 20, { align: 'center' });

  const pdfBytes = doc.output('arraybuffer');
  const tempPdfPath = path.join(process.cwd(), `uploads/temp_${transaction.publicId}.pdf`);
  fs.writeFileSync(tempPdfPath, Buffer.from(pdfBytes));

  const converter = fromPath(tempPdfPath, {
    density: 300,
    saveFilename: `trx_${transaction.publicId}`,
    savePath: path.join(process.cwd(), 'uploads'),
    format: 'png',
    width: 600,
    height: 800,
  });

  const result = await converter(1);

  const imageBuffer = fs.readFileSync(result.path);
  const finalImageDataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  fs.unlinkSync(tempPdfPath);
  fs.unlinkSync(result.path);

  return finalImageDataUri;
};
