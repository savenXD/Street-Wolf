import type { ZodType } from "zod";

export type ToolCategory = "scrape" | "outreach" | "post" | "call";

/** A lead as produced by a tool, before it is stored. */
export interface LeadInput {
  sourceId: string;
  name: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  raw?: unknown;
}

export interface ToolContext {
  jobId: string;
  workspaceId: string;
  campaignId: string | null;
  saveLeads(leads: LeadInput[]): Promise<number>;
  log(message: string, level?: "info" | "warn" | "error"): Promise<void>;
  progress(value: number): Promise<void>;
  signal: AbortSignal;
}

export interface Tool<Input = unknown> {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: ZodType<Input>;
  run(input: Input, ctx: ToolContext): Promise<void>;
}

export function defineTool<Input>(tool: Tool<Input>): Tool<Input> {
  return tool;
}
