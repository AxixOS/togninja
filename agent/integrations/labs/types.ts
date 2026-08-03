// Prodigi API Types
export interface ProdigiOrder {
  shippingMethod: number;
  idempotencyKey: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      postalOrZipCode: string;
      countryCode: string;
      townOrCity: string;
      stateOrCounty?: string;
    };
  };
  items: ProdigiItem[];
  metadata?: Record<string, any>;
}

export interface ProdigiItem {
  merchantReference: string;
  sku: string;
  copies: number;
  sizing: "fillPrintArea" | "fitPrintArea" | "stretchToPrintArea";
  attributes?: Record<string, any>;
  assets: ProdigiAsset[];
}

export interface ProdigiAsset {
  printArea: string;
  url: string;
}

export interface ProdigiResponse {
  id: string;
  status: string;
  created: string;
  lastUpdated: string;
  charges: Array<{
    id: string;
    prodigiInvoiceNumber: string;
    totalCost: {
      amount: string;
      currency: string;
    };
  }>;
  shipments: Array<{
    id: string;
    status: string;
    tracking?: {
      number: string;
      url: string;
    };
  }>;
  items: ProdigiItem[];
}

export interface ProdigiWebhookEvent {
  id: string;
  status: "received" | "in_production" | "shipped" | "fulfilled" | "cancelled";
  timestamp: string;
  orderId: string;
}