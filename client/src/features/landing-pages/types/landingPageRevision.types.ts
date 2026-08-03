// Landing Page Revision Types — Phase 3

export interface LandingPageRevisionRecord {
  id: string;
  landing_page_id: string;
  version_number: number;
  content_json: Record<string, unknown>;
  generation_context_json: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  note?: string | null;
}

export interface CreateLandingPageRevisionInput {
  landingPageId: string;
  contentJson: Record<string, unknown>;
  contextJson?: Record<string, unknown>;
  note?: string;
}

export interface LandingPageRevisionListResponse {
  revisions: LandingPageRevisionRecord[];
  total: number;
}
