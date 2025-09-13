import { jsPDF } from 'jspdf';
import { type InvoiceWithDetails } from '@shared/schema';

// Helper function for professional currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export class PDFService {
  static generateInvoicePDF(invoice: InvoiceWithDetails): Buffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add a subtle background gradient effect
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, 80, 'F');
    
    // Header section with modern design
    doc.setFillColor(30, 58, 138); // Deep blue
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Company name in header
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.company.name.toUpperCase(), 20, 18);
    
    // Invoice title with modern styling
    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 70, 18);
    
    // Status badge based on invoice status
    const statusColors = {
      paid: { bg: [22, 163, 74], text: [255, 255, 255] },      // Green
      pending: { bg: [251, 146, 60], text: [255, 255, 255] },   // Orange  
      overdue: { bg: [239, 68, 68], text: [255, 255, 255] },    // Red
      cancelled: { bg: [107, 114, 128], text: [255, 255, 255] } // Gray
    };
    
    const statusColor = statusColors[invoice.status as keyof typeof statusColors] || statusColors.pending;
    doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
    doc.roundedRect(pageWidth - 65, 20, 40, 8, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.status.toUpperCase(), pageWidth - 45, 25, { align: 'center' });
    
    // Company details in a styled box
    doc.setFillColor(243, 244, 246);
    doc.rect(20, 35, 85, 45, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(20, 35, 85, 45, 'S');
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    let companyY = 45;
    
    if (invoice.company.address) {
      doc.text(invoice.company.address, 25, companyY);
      companyY += 8;
    }
    if (invoice.company.phone) {
      doc.text(`📞 ${invoice.company.phone}`, 25, companyY);
      companyY += 8;
    }
    if (invoice.company.email) {
      doc.text(`✉️ ${invoice.company.email}`, 25, companyY);
      companyY += 8;
    }
    if (invoice.company.website) {
      doc.text(`🌐 ${invoice.company.website}`, 25, companyY);
    }

    // Invoice details in a styled box
    doc.setFillColor(254, 242, 242);
    doc.rect(115, 35, 75, 45, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.rect(115, 35, 75, 45, 'S');
    
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS', 120, 45);
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 120, 55);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })}`, 120, 63);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 120, 71);

    // Customer details with modern design
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 20, 100);
    
    // Customer info box
    doc.setFillColor(240, 253, 244);
    doc.rect(20, 105, 170, 30, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.rect(20, 105, 170, 30, 'S');
    
    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customer.name, 25, 115);
    
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer.email, 25, 123);
    
    if (invoice.customer.address) {
      doc.text(invoice.customer.address, 25, 130);
    }

    // Items table with enhanced styling
    const tableTop = 150;
    
    // Table header with gradient effect
    doc.setFillColor(30, 58, 138);
    doc.rect(20, tableTop, 170, 15, 'F');
    
    // Add subtle shadow effect
    doc.setFillColor(0, 0, 0, 0.1);
    doc.rect(21, tableTop + 1, 170, 15, 'F');
    
    // Header text
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', 25, tableTop + 10);
    doc.text('QTY', 120, tableTop + 10);
    doc.text('RATE', 140, tableTop + 10);
    doc.text('AMOUNT', 170, tableTop + 10);

    // Table rows with alternating colors
    let yPos = tableTop + 25;
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    invoice.items.forEach((item, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(20, yPos - 8, 170, 12, 'F');
      }
      
      // Add row border
      doc.setDrawColor(229, 231, 235);
      doc.line(20, yPos + 4, 190, yPos + 4);
      
      doc.text(item.description, 25, yPos);
      doc.text(item.quantity.toString(), 125, yPos, { align: 'center' });
      doc.text(formatCurrency(item.unitPrice), 145, yPos, { align: 'center' });
      doc.text(formatCurrency(item.total), 175, yPos, { align: 'right' });
      yPos += 12;
    });

    // Totals section with professional styling
    const totalsY = yPos + 15;
    
    // Totals background box
    doc.setFillColor(243, 244, 246);
    doc.rect(120, totalsY - 5, 70, 45, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(120, totalsY - 5, 70, 45, 'S');
    
    // Subtotal
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 125, totalsY + 5);
    doc.text(formatCurrency(invoice.subtotal), 185, totalsY + 5, { align: 'right' });
    
    // Tax
    doc.text('Tax (8%):', 125, totalsY + 15);
    doc.text(formatCurrency(invoice.tax), 185, totalsY + 15, { align: 'right' });
    
    // Total with emphasis
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 125, totalsY + 30);
    doc.text(formatCurrency(invoice.total), 185, totalsY + 30, { align: 'right' });

    // Notes section if present
    if (invoice.notes) {
      const notesY = totalsY + 50;
      doc.setFillColor(254, 243, 199);
      doc.rect(20, notesY - 5, 170, 25, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.rect(20, notesY - 5, 170, 25, 'S');
      
      doc.setFontSize(11);
      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES:', 25, notesY + 5);
      
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'normal');
      
      // Word wrap for notes
      const noteLines = doc.splitTextToSize(invoice.notes, 160);
      doc.text(noteLines, 25, notesY + 13);
    }

    // Professional footer with design elements
    const footerY = 270;
    doc.setFillColor(30, 58, 138);
    doc.rect(0, footerY, pageWidth, 25, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, pageWidth / 2, footerY + 18, { align: 'center' });

    return Buffer.from(doc.output('arraybuffer'));
  }
}
