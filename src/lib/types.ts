// ===============================
// Shared Types for ShiftWise App
// ===============================
// This file defines TypeScript types and interfaces used throughout the app.
// Types here are safe to use on both client and server.
//
// If you generate types from a database schema, keep server-only types elsewhere.

import type { z } from 'zod'; // Zod for schema inference
import type { shiftReportSchema, issueBlockSchema } from './schemas'; // Import schemas for type inference

// ===============================
// Form Value Types (from Zod schemas)
// ===============================
export type IssueBlockFormValues = z.infer<typeof issueBlockSchema>; // Type for a single issue block
export type ShiftReportFormValues = z.infer<typeof shiftReportSchema>; // Type for a full shift report

// ===============================
// Status Options
// ===============================
export const STATUS_OPTIONS = ['Open', 'In Progress', 'Completed', 'Escalated'] as const;
export type StatusOption = (typeof STATUS_OPTIONS)[number]; // Union type for status

// ===============================
// DisplayIssue Interface
// ===============================
// Used for displaying issues pulled from Firestore, with extra metadata
export interface DisplayIssue extends IssueBlockFormValues {
  /** Unique identifier for React lists */
  id: string;
  /** Firestore ID of the parent shift report */
  reportId: string;
  /** Index of the issue within the report issues array */
  issueIndex: number;
  /** Date the report was submitted */
  reportDate: Date;
  /** Person who submitted the report */
  submittedBy: string;
}
