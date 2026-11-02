"use client";

import React from "react";
import Link from "next/link";

interface SafeMarkdownProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

// Safely parses inline markdown tokens: **bold**, `code`, and [label](url)
function parseInlineMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  // Regex to match:
  // 1. [label](url)
  // 2. **bold**
  // 3. `inline code`
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Plain text before token
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];

    // Markdown link: [label](url)
    if (fullMatch.startsWith("[")) {
      const label = match[2];
      const rawUrl = match[3]?.trim() || "";

      // Security check: Only allow safe protocols or internal relative paths
      const isSafeUrl =
        rawUrl.startsWith("/") ||
        rawUrl.startsWith("https://") ||
        rawUrl.startsWith("http://") ||
        rawUrl.startsWith("mailto:") ||
        rawUrl.startsWith("tel:");

      if (isSafeUrl) {
        nodes.push(
          <Link
            key={`link-${match.index}`}
            href={rawUrl}
            className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
            target={rawUrl.startsWith("http") ? "_blank" : undefined}
            rel={rawUrl.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            {label}
          </Link>
        );
      } else {
        nodes.push(label);
      }
    }
    // Bold text: **bold**
    else if (fullMatch.startsWith("**")) {
      const boldText = match[4];
      nodes.push(
        <strong
          key={`bold-${match.index}`}
          className={`font-semibold ${isUser ? "text-white" : "text-foreground"}`}
        >
          {boldText}
        </strong>
      );
    }
    // Inline code: `code`
    else if (fullMatch.startsWith("`")) {
      const codeText = match[5];
      nodes.push(
        <code
          key={`code-${match.index}`}
          className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
            isUser
              ? "bg-white/20 text-white"
              : "bg-black/10 dark:bg-white/10 text-foreground"
          }`}
        >
          {codeText}
        </code>
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Trailing text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function SafeMarkdown({
  content,
  className = "",
  isUser = false,
}: SafeMarkdownProps) {
  if (!content) return null;

  // Split content by single or double line breaks while preserving structure
  const lines = content.split("\n");

  return (
    <div className={`space-y-1.5 text-xs leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line becomes a modest vertical spacer
        if (!trimmed) {
          return <div key={idx} className="h-1.5" aria-hidden="true" />;
        }

        // Bullet point lines starting with •, -, or *
        if (/^[•\-\*]\s/.test(trimmed)) {
          const bulletContent = trimmed.replace(/^[•\-\*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  isUser ? "bg-white/70" : "bg-primary/80"
                }`}
                aria-hidden="true"
              />
              <span className="flex-1">
                {parseInlineMarkdown(bulletContent, isUser)}
              </span>
            </div>
          );
        }

        // Numbered list items starting with 1., 2., etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          const num = numMatch[1];
          const numContent = numMatch[2];
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
              <span
                className={`font-semibold text-[11px] shrink-0 min-w-[14px] ${
                  isUser ? "text-white/80" : "text-muted"
                }`}
              >
                {num}.
              </span>
              <span className="flex-1">
                {parseInlineMarkdown(numContent, isUser)}
              </span>
            </div>
          );
        }

        // Standard text paragraph
        return (
          <p key={idx} className="min-h-[1.25em]">
            {parseInlineMarkdown(line, isUser)}
          </p>
        );
      })}
    </div>
  );
}

