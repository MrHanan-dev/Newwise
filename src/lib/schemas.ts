// ===============================
// Zod Schemas for ShiftWise App
// ===============================
// This file defines validation schemas for forms using Zod.
// These schemas are used for both client-side and server-side validation.

import { z } from 'zod'; // Zod for schema validation
import { STATUS_OPTIONS } from './types'; // Import status options

// ===============================
// Issue Block Schema
// ===============================
// Describes the shape and validation for a single issue block in a report
export const issueBlockSchema = z.object({
  // id is automatically added by react-hook-form's useFieldArray
  // id: z.string().optional(), 
  issue: z.string().min(1, "Issue title is required.").max(200, "Issue title cannot exceed 200 characters."),
  pmun: z.string().max(50, "PMUN cannot exceed 50 characters.").optional().default(''),
  description: z.string().min(1, "Description is required.").max(2000, "Description cannot exceed 2000 characters."),
  actions: z.string().max(2000, "Actions/Follow-up cannot exceed 2000 characters.").optional().default(''),
  status: z.enum(STATUS_OPTIONS, {
    errorMap: () => ({ message: "Please select a valid status." })
  }).default('Open'),
  photos: z.array(z.string()).optional().default([]),
  history: z.array(z.object({
    status: z.enum(STATUS_OPTIONS),
    changedBy: z.string(),
    changedAt: z.date(),
    note: z.string().optional(),
    role: z.string().optional(),
  })).optional().default([]),
});

// ===============================
// Shift Report Schema
// ===============================
// Describes the shape and validation for a full shift report
export const shiftReportSchema = z.object({
  submittedBy: z.string().min(1, "Submitter name is required.").max(100, "Submitter name cannot exceed 100 characters."),
  reportDate: z.date({ required_error: "Report date is required." }),
  issues: z.array(issueBlockSchema).min(1, "At least one issue block is required."),
});
