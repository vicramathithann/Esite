import React from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function WarrantiesLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <ArrowLeft className="w-4 h-4" />
            <div className="h-4 w-28 bg-tile rounded animate-pulse" />
          </div>
          <div className="h-7 w-36 bg-tile border border-border rounded-full animate-pulse" />
        </div>

        {/* Hero Banner Skeleton */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sandal-secondary-bg border border-sandal-secondary-border flex items-center justify-center text-[#C9A66B] shrink-0">
              <ShieldCheck className="w-7 h-7 opacity-50" />
            </div>
            <div className="space-y-2 flex-1">
              <div className="h-7 w-64 bg-tile rounded-lg animate-pulse" />
              <div className="h-4 w-full max-w-md bg-tile rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <div className="h-9 w-28 bg-tile border border-border rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-tile border border-border rounded-xl animate-pulse" />
          <div className="h-9 w-32 bg-tile border border-border rounded-xl animate-pulse" />
        </div>

        {/* Card Skeleton 1 */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-tile border border-border shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-48 bg-tile rounded" />
                <div className="h-3.5 w-32 bg-tile rounded" />
              </div>
            </div>
            <div className="h-7 w-36 bg-tile rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-tile border border-border rounded-xl p-4">
            <div className="space-y-1.5">
              <div className="h-3 w-16 bg-muted/20 rounded" />
              <div className="h-4 w-28 bg-muted/30 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-muted/20 rounded" />
              <div className="h-4 w-32 bg-muted/30 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-muted/20 rounded" />
              <div className="h-4 w-36 bg-muted/30 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-24 bg-muted/20 rounded" />
              <div className="h-4 w-20 bg-muted/30 rounded" />
            </div>
          </div>

          <div className="space-y-2 bg-background border border-border rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-36 bg-tile rounded" />
              <div className="h-4 w-44 bg-tile rounded" />
            </div>
            <div className="h-2 w-full bg-tile rounded-full" />
          </div>
        </div>

        {/* Card Skeleton 2 */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 opacity-60 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-tile border border-border shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-44 bg-tile rounded" />
                <div className="h-3.5 w-28 bg-tile rounded" />
              </div>
            </div>
            <div className="h-7 w-32 bg-tile rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

