// SendGrid email service - based on blueprint:javascript_sendgrid
import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

function initializeMailService(): boolean {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY environment variable not set - email functionality disabled');
    return false;
  }
  
  if (!mailService) {
    mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
  }
  
  return true;
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  if (!initializeMailService()) {
    return { success: false, error: 'Email service not configured' };
  }
  
  try {
    await mailService!.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html,
    });
    return { success: true };
  } catch (error) {
    console.error('SendGrid email error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

// HTML escape utility
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export async function sendInvoiceEmail(
  invoiceWithDetails: any
): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com';
  
  if (!initializeMailService()) {
    return { success: false, error: 'Email service not configured' };
  }
  const { customer, invoiceNumber, total, dueDate } = invoiceWithDetails;
  
  // Escape all dynamic content for security
  const escapedInvoiceNumber = escapeHtml(invoiceNumber);
  const escapedCustomerName = escapeHtml(customer.name);
  const escapedCustomerEmail = escapeHtml(customer.email);
  const formattedDueDate = new Date(dueDate).toLocaleDateString();
  const formattedTotal = total.toFixed(2);
  
  const subject = `Invoice ${escapedInvoiceNumber} from BillMaster Pro`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .invoice-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { background-color: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; }
        .total { font-size: 18px; font-weight: bold; color: #198754; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Invoice ${escapedInvoiceNumber}</h1>
        <p>BillMaster Pro</p>
      </div>
      
      <div class="content">
        <p>Dear ${escapedCustomerName},</p>
        
        <p>Thank you for your business! Please find your invoice details below:</p>
        
        <div class="invoice-details">
          <h3>Invoice Details</h3>
          <p><strong>Invoice Number:</strong> ${escapedInvoiceNumber}</p>
          <p><strong>Customer:</strong> ${escapedCustomerName}</p>
          <p><strong>Email:</strong> ${escapedCustomerEmail}</p>
          <p><strong>Due Date:</strong> ${formattedDueDate}</p>
          <p class="total"><strong>Total Amount:</strong> $${formattedTotal}</p>
        </div>
        
        <p>To view the full invoice details or download a PDF copy, please log into your BillMaster Pro account.</p>
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>BillMaster Pro Team</p>
      </div>
      
      <div class="footer">
        <p>This is an automated email from BillMaster Pro. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;
  
  const textContent = `
Invoice ${escapedInvoiceNumber} from BillMaster Pro

Dear ${escapedCustomerName},

Thank you for your business! Please find your invoice details below:

Invoice Number: ${escapedInvoiceNumber}
Customer: ${escapedCustomerName}
Email: ${escapedCustomerEmail}
Due Date: ${formattedDueDate}
Total Amount: $${formattedTotal}

To view the full invoice details or download a PDF copy, please log into your BillMaster Pro account.

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
BillMaster Pro Team

---
This is an automated email from BillMaster Pro. Please do not reply to this email.
  `;

  return await sendEmail({
    to: customer.email,
    from: fromEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}