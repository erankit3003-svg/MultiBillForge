import { jsPDF } from 'jspdf';
import { type InvoiceWithDetails } from '@shared/schema';

export class PDFService {
  static generateInvoicePDF(invoice: InvoiceWithDetails): Buffer {
    const doc = new jsPDF();

    // Company header
    doc.setFontSize(20);
    doc.setTextColor(32, 100, 210); // Primary blue color
    doc.text(invoice.company.name, 20, 30);

    // Company details
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (invoice.company.address) {
      doc.text(invoice.company.address, 20, 40);
    }
    if (invoice.company.phone) {
      doc.text(`Phone: ${invoice.company.phone}`, 20, 45);
    }
    if (invoice.company.email) {
      doc.text(`Email: ${invoice.company.email}`, 20, 50);
    }

    // Invoice title
    doc.setFontSize(24);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 150, 30);

    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 150, 45);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 150, 55);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 150, 65);

    // Customer details
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Bill To:', 20, 80);
    
    doc.setFontSize(12);
    doc.text(invoice.customer.name, 20, 90);
    doc.text(invoice.customer.email, 20, 100);
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, 20, 110);
    }

    // Table header
    const tableTop = 130;
    doc.setFillColor(32, 100, 210);
    doc.rect(20, tableTop, 170, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Description', 25, tableTop + 7);
    doc.text('Qty', 130, tableTop + 7);
    doc.text('Price', 150, tableTop + 7);
    doc.text('Total', 170, tableTop + 7);

    // Table rows
    let yPos = tableTop + 20;
    doc.setTextColor(0, 0, 0);
    
    invoice.items.forEach((item) => {
      doc.text(item.description, 25, yPos);
      doc.text(item.quantity.toString(), 130, yPos);
      doc.text(`$${item.unitPrice.toFixed(2)}`, 150, yPos);
      doc.text(`$${item.total.toFixed(2)}`, 170, yPos);
      yPos += 10;
    });

    // Totals
    const totalsY = yPos + 20;
    doc.text(`Subtotal: $${invoice.subtotal.toFixed(2)}`, 130, totalsY);
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`, 130, totalsY + 10);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${invoice.total.toFixed(2)}`, 130, totalsY + 25);

    // Notes
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Notes:', 20, totalsY + 40);
      doc.text(invoice.notes, 20, totalsY + 50);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 20, 280);

    return Buffer.from(doc.output('arraybuffer'));
  }
}
