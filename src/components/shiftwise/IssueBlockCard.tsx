// ===============================
// Issue Block Card (Form Section)
// ===============================
// This component renders a single issue block in the shift report form.
// Used for both creating and editing issues. Supports photo upload.
// Receives index, remove handler, and other props from parent.

// @ts-nocheck

"use client";

// ===== Imports =====
import React, { useRef, forwardRef } from "react";
import { useState } from "react"; // React state
import { useFormContext } from "react-hook-form"; // For form context
import PhotoUploader from "@/components/PhotoUploader"; // Photo upload component
import { Input } from "@/components/ui/input"; // Input field
import { Button } from "@/components/ui/button"; // Button
import { Textarea } from "@/components/ui/textarea"; // Textarea
import { Select, SelectItem, SelectTrigger, SelectContent, SelectValue } from "@/components/ui/select"; // Dropdown
import { X } from "lucide-react"; // Icon for remove
import { NotificationToggle } from "@/components/ui/notification-toggle"; // Notification toggle
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"; // Form helpers

/**
 * Props:
 * - index: number (the index of this issue in the list)
 * - onRemove: function (to remove this issue block)
 * - isOnlyBlock: boolean (true if this is the only issue block)
 * - onPhotoUpload: function (called when photos are uploaded)
 * - issueId: string (optional, ID of the issue for notification subscription)
 * - reportId: string (optional, ID of the report for notification subscription)
 */
export const IssueBlockCard = forwardRef(function IssueBlockCard({
  index, // Index of this issue block in the parent array
  onRemove, // Function to remove this block
  isOnlyBlock, // True if this is the only block
  photoUrls = [], // NEW: receive photoUrls from parent
  onPhotoUpload, // Callback for photo upload
  photoUploaderRef, // NEW: pass ref from parent
  issueId = `new-issue-${Date.now()}-${index}`, // Unique ID for the issue (for notifications)
  reportId = 'new-report', // Report ID (for notifications)
  ...otherProps
}, ref) {
  // ====== Form Context ======
  // Get control and setValue from the parent FormProvider
  const { control, setValue } = useFormContext();

  // Option list for Status dropdown
  const STATUS_OPTIONS = ["Open", "In Progress", "Completed", "Escalated"];

  // Ref for PhotoUploader
  const localPhotoUploaderRef = useRef(null);

  // =====================
  // Render Issue Block UI
  // =====================
  return (
    <div className="bg-card text-card-foreground p-3 sm:p-4 md:p-6 rounded-xl shadow mb-6 sm:mb-10 border relative w-full">
      {/* ===================== Issue Block Header ===================== */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="font-bold text-base sm:text-lg">Issue #{index + 1}</h2>          {/* Modern notification subscribe option with pulse effect */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 transform transition-all hover:scale-105 p-1 rounded-full bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200/40 shadow-sm">
              <div className="relative">
                <NotificationToggle 
                  issueId={issueId} 
                  reportId={reportId}
                  variant="icon"
                  size="sm"
                  className="text-blue-500 hover:text-blue-600" 
                />
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="animate-ping absolute h-2 w-2 rounded-full bg-blue-400 opacity-75"></div>
                  <div className="relative rounded-full h-2 w-2 bg-blue-500"></div>
                </div>
              </div>
              <span className="text-xs text-blue-600 font-medium max-w-0 group-hover:max-w-24 transition-all duration-300 overflow-hidden whitespace-nowrap">
                Get updates
              </span>
            </div>
            <div className="absolute -left-1 -top-9 bg-gradient-to-br from-blue-600 to-blue-500 text-white text-xs rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-95 transition-all duration-300 shadow-lg whitespace-nowrap z-10 pointer-events-none">
              <div className="absolute bottom-0 left-2 transform translate-y-1/2 rotate-45 w-2 h-2 bg-blue-500"></div>
              Subscribe to issue updates
            </div>
          </div>
        </div>
        
        {/* Remove button calls onRemove from parent */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={isOnlyBlock}
          className="text-destructive"
          aria-label="Remove issue"
        >
          <X />
        </Button>
      </div>

      {/* ===================== Issue/Title ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.issue` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>Issue / Title</FormLabel>
            <FormControl>
              <Input placeholder="Issue title" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== PMUN ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.pmun` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>PMUN (Product Master Unique Number)</FormLabel>
            <FormControl>
              <Input placeholder="PMUN" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== Description ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.description` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Description" {...field} />
            </FormControl>
            <Button
              type="button"
              size="sm"
              className="mt-2 bg-gradient-to-r from-blue-500 to-green-400 text-white font-semibold shadow-lg focus:ring-2 focus:ring-blue-300 focus:outline-none transition-all duration-200 transform-gpu hover:scale-105 active:scale-95 animated-glow"
              variant="default"
              onClick={async () => {
                try {
                  const response = await fetch('/api/ai-suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: field.value }),
                  });
                  if (!response.ok) throw new Error('AI API error');
                  const data = await response.json();
                  // If PMUN is missing from cleaned_description, but present in original, add it back
                  let cleanedDesc = data.cleaned_description || '';
                  const pmun = data.pmun || '';
                  if (pmun && cleanedDesc && !cleanedDesc.includes(pmun)) {
                    cleanedDesc = `${cleanedDesc}\n\nPMUN: ${pmun}`;
                  }
                  if (typeof cleanedDesc === 'string') field.onChange(cleanedDesc);
                  if (typeof pmun === 'string') setValue(`issues.${index}.pmun`, pmun);
                  if (typeof data.title === 'string') setValue(`issues.${index}.issue`, data.title);
                } catch (err) {
                  alert('AI suggestion failed. Please try again.');
                }
              }}
            >
              <span className="flex items-center gap-2">
                🤖 AI Suggest Correction
              </span>
            </Button>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== Actions ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.actions` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>Actions / Follow-up / Notification No.</FormLabel>
            <FormControl>
              <Textarea placeholder="Actions, follow-up, notification..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== Status Dropdown ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.status` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== Notification Toggle ===================== */}
      <FormField
        control={control}
        name={`issues.${index}.notification` as const}
        render={({ field }) => (
          <FormItem className="mb-3">
            <FormLabel>Notification</FormLabel>
            <FormControl>
              <NotificationToggle
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ===================== Photo Uploader Section ===================== */}
      <div className="mb-2">
        <PhotoUploader
          ref={photoUploaderRef || ref || localPhotoUploaderRef}
          onUploadComplete={(urls) => {
            onPhotoUpload(urls);
            setValue(`issues.${index}.photos`, urls);
          }}
        />
        {/* Image preview */}
        <div className="flex gap-1 sm:gap-2 mt-2">
          {photoUrls.map((url) => (
            <img key={url} src={url} alt="Uploaded" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded border" />
          ))}
        </div>
      </div>
    </div>
  );
});

export default React.memo(IssueBlockCard);
