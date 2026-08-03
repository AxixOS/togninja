// Agent context interface
export interface AgentCtx {
  studioId: string;
  userId: string;
  studioName: string;
  mode: string;
  policy: {
    mode: "read_only" | "propose" | "auto_safe" | "auto_all";
    authorities: string[];
    approval_required_over_amount: number;
    email_send_mode: string;
    invoice_auto_limit: number;
  };
  creds: {
    currency: string;
  };
}