import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fromPath } from 'pdf2pic';
import * as fs from 'fs';
import * as path from 'path';

export const generateTransactionImage = async (transaction: any, logoDataUri?: string) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const horizontalMargin = 15;
  const logoSize = 30;
  const logoY = 15;

  let titleY = 25;

  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', horizontalMargin, logoY, logoSize, logoSize);
    titleY = logoY + logoSize + 10;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE TRANSACCIÓN', pageWidth / 2, titleY, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const transactionInfoStartY = titleY + 6;
  doc.text(`N°: TRX-${new Date().getFullYear()}-${transaction.publicId}`, pageWidth - horizontalMargin, transactionInfoStartY, { align: 'right' });
  doc.text(`Fecha: ${new Date(transaction.createdAt).toLocaleString()}`, pageWidth - horizontalMargin, transactionInfoStartY + 5, { align: 'right' });

  const preferredContact = transaction.cliente || transaction.creador || {};
  const fallbackContact = transaction.creador || {};
  const contactName = preferredContact.name || fallbackContact.name || 'N/A';
  const contactPhone = preferredContact.phone || fallbackContact.phone || 'N/A';
  const contactEmail = preferredContact.email || fallbackContact.email || 'N/A';
  const instrumentType = transaction.instrument?.typeInstrument || '';
  const formattedInstrumentType = instrumentType
    ? instrumentType.toLowerCase().split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'N/A';

  const clientTableStartY = transactionInfoStartY + 12;
  autoTable(doc, {
    startY: clientTableStartY,
    body: [
      ['Nombre', contactName],
      ['Teléfono', '+' + contactPhone],
      ['Correo', contactEmail],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: horizontalMargin, right: horizontalMargin },
  });

  const clientTableFinalY = (doc as any).lastAutoTable?.finalY || clientTableStartY + 20;

  doc.setFont('helvetica', 'bold');
  const transactionDetailTitleY = clientTableFinalY + 8;
  doc.text('DETALLE DE TRANSACCIÓN:', horizontalMargin, transactionDetailTitleY);
  doc.setFont('helvetica', 'normal');

  autoTable(doc, {
    startY: transactionDetailTitleY + 5,
    body: [
      ['Método', formattedInstrumentType],
      ['Titular', transaction.instrument.holder],
      ['Documento', transaction.instrument.document],
      ['Número o Id', transaction.instrument.accountNumber],
      ['Monto', `${transaction.montoDestino} ${transaction.destino?.currency || ''}`],
      ['Referencia', transaction.nro_referencia || 'N/A'],
      ['Estado', transaction.status || 'N/A'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: horizontalMargin, right: horizontalMargin },
  });

  // Footer
  doc.setFontSize(8);
  doc.text('CONECTA – Soluciones Financieras', 15, pageHeight - 20);

  // Guardar PDF temporal
  const pdfBytes = doc.output('arraybuffer');
  const tempPdfPath = path.join(process.cwd(), `uploads/temp_${transaction.publicId}.pdf`);
  fs.writeFileSync(tempPdfPath, Buffer.from(pdfBytes));

  // Convertir PDF -> PNG con pdf2pic
  const converter = fromPath(tempPdfPath, {
    density: 300,
    saveFilename: `trx_${transaction.publicId}`,
    savePath: path.join(process.cwd(), 'uploads'),
    format: 'png',
    width: 600,
    height: 800,
  });

  const result = await converter(1); // convierte la primera página a PNG

  // Leer la imagen generada
  const imageBuffer = fs.readFileSync(result.path);
  const finalImageDataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  // Limpiar archivos temporales
  fs.unlinkSync(tempPdfPath);
  fs.unlinkSync(result.path);

  return finalImageDataUri;
};
