import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '@prisma/client';

export const generateTransactionPdf = async (transaction: any, logoDataUri?: string) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  if (logoDataUri) {
    doc.addImage(logoDataUri, 'PNG', 15, 10, 30, 15);
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROBANTE DE TRANSACCIÓN', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N°: TRX-${new Date().getFullYear()}-${transaction.publicId}`, 15, 30);
  doc.text(`Fecha: ${new Date(transaction.createdAt).toLocaleString()}`, 15, 35);
  
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE:', 15, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.cliente?.name || transaction.creador?.name || 'N/A', 15, 50);
  
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE TRANSACCIÓN:', 15, 60);
  doc.setFont('helvetica', 'normal');
  
  autoTable(doc, {
    startY: 65,
    body: [
      ['Método', 'PAGO MÓVIL'],
      ['Monto', `${transaction.montoDestino} ${transaction.destino?.currency || ''}`],
      ['Referencia', transaction.nro_referencia || 'N/A'],
      ['Estado', transaction.status || 'N/A'],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 15, right: 15 },
  });

  // Footer without QR code
  doc.setFontSize(8);
  doc.text('CONECTA – Soluciones Financieras', 15, pageHeight - 20);

  return doc.output('datauristring');
};
