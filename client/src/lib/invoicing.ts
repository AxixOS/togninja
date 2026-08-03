import jsPDF from 'jspdf';
// Using Neon database with Express API endpoints

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  tax_rate?: number;
  category?: string;
}

export interface Invoice {
  id?: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  client_address?: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'awaiting_payment';
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes?: string;
  terms?: string;
  payment_method?: string;
  paid_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  company?: string;
  tax_number?: string;
}

export interface PriceListItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  unit?: string;
  tax_rate?: number;
  is_active: boolean;
}

// Invoice generation utilities
export const invoiceService = {
  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    try {
      // Get the latest invoice number for this year via API
      const response = await fetch(`/api/invoices/latest-number?year=${year}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error('Failed to fetch latest invoice number');
      }
      
      const data = await response.json();
      let nextNumber = 1;
      
      if (data && data.invoice_number) {
        const lastNumber = data.invoice_number;
        const lastSequence = parseInt(lastNumber.split('-')[2] || '0');
        nextNumber = lastSequence + 1;
      }

      return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      // Fallback to simple timestamp-based number
      return `INV-${year}-${String(Date.now()).slice(-4)}`;
    }
  },

  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<Invoice> {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...invoiceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  async getInvoices(limit = 50, offset = 0): Promise<Invoice[]> {
    try {
      const response = await fetch(`/api/invoices?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch invoice');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  },

  async deleteInvoice(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  calculateInvoiceTotals(items: InvoiceItem[]): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemTax = item.amount * ((item.tax_rate || 0) / 100);
      return sum + itemTax;
    }, 0);
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
};

// PDF generation
export const pdfService = {
  generateInvoicePDF(invoice: Invoice, client: Client): jsPDF {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Company header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TogNinja', 20, yPosition);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Photography Services', 20, yPosition + 8);
    doc.text('info@togninja.com | www.togninja.com', 20, yPosition + 16);

    // Invoice title and number
    yPosition += 40;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 60, yPosition, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoice_number}`, pageWidth - 60, yPosition + 12, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, pageWidth - 60, yPosition + 20, { align: 'right' });
    doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 60, yPosition + 28, { align: 'right' });

    // Client information
    yPosition += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPosition);
    
    doc.setFont('helvetica', 'normal');
    yPosition += 8;
    if (client.company) {
      doc.text(client.company, 20, yPosition);
      yPosition += 6;
    }
    doc.text(`${client.first_name} ${client.last_name}`, 20, yPosition);
    yPosition += 6;
    if (client.address) {
      doc.text(client.address, 20, yPosition);
      yPosition += 6;
    }
    if (client.city || client.postal_code) {
      doc.text(`${client.city || ''} ${client.postal_code || ''}`, 20, yPosition);
      yPosition += 6;
    }
    if (client.email) {
      doc.text(client.email, 20, yPosition);
      yPosition += 6;
    }

    // Items table
    yPosition += 20;
    const tableTop = yPosition;
    
    // Table headers
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 20, yPosition);
    doc.text('Qty', 120, yPosition, { align: 'center' });
    doc.text('Rate', 140, yPosition, { align: 'right' });
    doc.text('Amount', pageWidth - 20, yPosition, { align: 'right' });
    
    // Table line
    yPosition += 4;
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    
    // Table items
    doc.setFont('helvetica', 'normal');
    yPosition += 8;
    
    invoice.items.forEach(item => {
      doc.text(item.description, 20, yPosition);
      doc.text(item.quantity.toString(), 120, yPosition, { align: 'center' });
      doc.text(`€${item.rate.toFixed(2)}`, 140, yPosition, { align: 'right' });
      doc.text(`€${item.amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
      yPosition += 8;
    });

    // Totals
    yPosition += 10;
    doc.line(120, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;
    
    doc.text(`Subtotal: €${invoice.subtotal.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;
    doc.text(`Tax: €${invoice.tax_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });
    yPosition += 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: €${invoice.total_amount.toFixed(2)}`, pageWidth - 20, yPosition, { align: 'right' });

    // Notes and terms
    if (invoice.notes || invoice.terms) {
      yPosition += 30;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPosition);
      
      doc.setFont('helvetica', 'normal');
      yPosition += 8;
      if (invoice.notes) {
        const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
        doc.text(notesLines, 20, yPosition);
        yPosition += notesLines.length * 6;
      }
      
      if (invoice.terms) {
        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Terms:', 20, yPosition);
        
        doc.setFont('helvetica', 'normal');
        yPosition += 8;
        const termsLines = doc.splitTextToSize(invoice.terms, pageWidth - 40);
        doc.text(termsLines, 20, yPosition);
      }
    }

    return doc;
  },

  downloadInvoicePDF(invoice: Invoice, client: Client): void {
    const doc = this.generateInvoicePDF(invoice, client);
    doc.save(`invoice-${invoice.invoice_number}.pdf`);
  },

  getInvoicePDFBlob(invoice: Invoice, client: Client): Blob {
    const doc = this.generateInvoicePDF(invoice, client);
    return doc.output('blob');
  }
};

// Email service
export const emailService = {
  async sendInvoiceEmail(invoice: Invoice, client: Client, customMessage?: string): Promise<void> {
    try {
      // Generate PDF
      const pdfBlob = pdfService.getInvoicePDFBlob(invoice, client);
      
      // Convert blob to base64
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Send email via API
      const response = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to: client.email,
          subject: `Invoice ${invoice.invoice_number} from TogNinja`,
          invoice: invoice,
          client: client,
          customMessage: customMessage,
          pdfAttachment: pdfBase64
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invoice email');
      }

      const data = await response.json();

      // Update invoice status
      await invoiceService.updateInvoice(invoice.id!, { status: 'sent' });

      return data;
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  },

  async sendPaymentReminder(invoice: Invoice, client: Client): Promise<void> {
    try {
      const response = await fetch('/api/invoices/send-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          to: client.email,
          subject: `Payment Reminder - Invoice ${invoice.invoice_number}`,
          invoice: invoice,
          client: client
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send payment reminder');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      throw error;
    }
  }
};

// Price list service
export const priceListService = {
  async getPriceListItems(): Promise<PriceListItem[]> {
    try {
      const response = await fetch('/api/crm/price-list');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  async createPriceListItem(item: Omit<PriceListItem, 'id'>): Promise<PriceListItem> {
    try {
      const response = await fetch('/api/crm/price-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error('Failed to create price list item');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // console.error removed
      throw error;
    }
  },

  async updatePriceListItem(id: string, updates: Partial<PriceListItem>): Promise<PriceListItem> {
    try {
      const response = await fetch(`/api/crm/price-list/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update price list item');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating price list item:', error);
      throw error;
    }
  },

  async deletePriceListItem(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/crm/price-list/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete price list item');
      }
    } catch (error) {
      console.error('Error deleting price list item:', error);
      throw error;
    }
  },

  async importPriceList(items: Omit<PriceListItem, 'id'>[]): Promise<PriceListItem[]> {
    try {
      const response = await fetch('/api/crm/price-list/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('Failed to import price list');
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error importing price list:', error);
      throw error;
    }
  }
};

// Payment tracking
export const paymentService = {
  async markInvoiceAsPaid(invoiceId: string, paymentDate?: string, paymentMethod?: string): Promise<void> {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          paid_date: paymentDate || new Date().toISOString(),
          payment_method: paymentMethod
        })
      });

      if (!response.ok) {
        throw new Error('Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      throw error;
    }
  },

  async getPaymentStats(): Promise<{
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    averagePaymentTime: number;
  }> {
    try {
      const response = await fetch('/api/invoices/payment-stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment stats');
      }

      const data = await response.json();
      return {
        totalPaid: data.totalPaid || 0,
        totalPending: data.totalPending || 0,
        totalOverdue: data.totalOverdue || 0,
        averagePaymentTime: data.averagePaymentTime || 0
      };
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      // Return default values on error
      return {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        averagePaymentTime: 0
      };
    }
  }
};
