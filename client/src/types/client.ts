export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  clientId: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  totalSales: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportLog {
  id: string;
  filename: string;
  importedBy: string;
  rowsProcessed: number;
  rowsSuccess: number;
  rowsError: number;
  errorFileUrl?: string;
  createdAt: string;
}

export interface ColumnMapping {
  firstName: string;
  lastName: string;
  clientId: string;
  email: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  totalSales?: string;
  outstandingBalance?: string;
}

export interface ImportPreset {
  id: string;
  name: string;
  mapping: ColumnMapping;
  createdAt: string;
}

export interface ImportStatus {
  importId: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  rowsProcessed: number;
  rowsSuccess: number;
  rowsError: number;
  errorFileUrl?: string;
}