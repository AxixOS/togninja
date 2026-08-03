import { db } from '../../server/db.js';
import { aiPolicies } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export type Authority =
  | "READ_CLIENTS"
  | "READ_LEADS"
  | "READ_SESSIONS"
  | "READ_INVOICES"
  | "DRAFT_EMAIL"
  | "CREATE_LEAD"
  | "UPDATE_CLIENT"
  | "SEND_INVOICE"
  | "SEND_EMAIL"
  | "CREATE_SESSION";

export interface AgentPolicy {
  mode: "read_only" | "propose" | "auto_safe" | "auto_all";
  authorities: Authority[];
  invoice_auto_limit: number;
  email_send_mode: "draft" | "trusted" | "auto";
  // Phase B: Enhanced guardrail controls
  restricted_fields: Record<string, string[]>; // table -> field names
  auto_safe_actions: string[]; // actions that can run without approval in auto_safe mode
  max_ops_per_hour: number; // rate limiting
  approval_required_over_amount: number; // monetary threshold for invoices
  email_domain_trustlist: string[]; // domains that can receive auto emails
}

// `db` is the shared portable (node-postgres) drizzle instance from server/db.ts.

export async function loadPolicy(studioId: string): Promise<AgentPolicy> {
  try {
    const data = await db.select().from(aiPolicies).where(eq(aiPolicies.studioId, studioId));
    
    if (!data || data.length === 0) {
      return {
        mode: "auto_safe",
        authorities: ["READ_CLIENTS","READ_LEADS","READ_SESSIONS","READ_INVOICES","DRAFT_EMAIL","CREATE_LEAD","UPDATE_CLIENT","SEND_EMAIL","CREATE_SESSION"],
        invoice_auto_limit: 500,
        email_send_mode: "auto",
        // Phase B: Default safe policy
        restricted_fields: {
          "crm_clients": ["email", "phone"],
          "crm_leads": [],
          "crm_invoices": ["amount", "tax_amount"]
        },
        auto_safe_actions: ["create_lead"],
        max_ops_per_hour: 50,
        approval_required_over_amount: 500,
        email_domain_trustlist: ["gmail.com", "yahoo.com", "outlook.com"]
      };
    }

    const policy = data[0];
    return {
      mode: policy.mode as "read_only" | "propose" | "auto_safe" | "auto_all",
      authorities: policy.authorities ?? [],
      invoice_auto_limit: Number(policy.invoice_auto_limit ?? 0),
      email_send_mode: policy.email_send_mode as "draft" | "trusted" | "auto",
      // Phase B: Enhanced policy fields with safe defaults
      restricted_fields: policy.restricted_fields ?? {
        "crm_clients": ["email", "phone"],
        "crm_leads": [],
        "crm_invoices": ["amount", "tax_amount"]
      },
      auto_safe_actions: policy.auto_safe_actions ?? ["create_lead"],
      max_ops_per_hour: Number(policy.max_ops_per_hour ?? 50),
      approval_required_over_amount: Number(policy.approval_required_over_amount ?? 500),
      email_domain_trustlist: policy.email_domain_trustlist ?? ["gmail.com", "yahoo.com", "outlook.com"]
    };
  } catch (error) {
    console.error("Failed to load policy:", error);
    return {
      mode: "read_only",
      authorities: ["READ_CLIENTS","READ_LEADS","READ_SESSIONS","READ_INVOICES","DRAFT_EMAIL"],
      invoice_auto_limit: 0,
      email_send_mode: "draft",
      // Phase B: Safe fallback policy
      restricted_fields: {
        "crm_clients": ["email", "phone"],
        "crm_leads": [],
        "crm_invoices": ["amount", "tax_amount"]
      },
      auto_safe_actions: ["create_lead"],
      max_ops_per_hour: 50,
      approval_required_over_amount: 500,
      email_domain_trustlist: ["gmail.com", "yahoo.com", "outlook.com"]
    };
  }
}