import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xs text-center space-y-5">
        <div className="w-14 h-14 bg-muted/20 border border-border text-muted-foreground rounded-2xl flex items-center justify-center mx-auto">
          <FileQuestion className="w-7 h-7 text-muted" />
        </div>
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-muted bg-muted/10 px-2.5 py-0.5 rounded-full border border-border">
            404 Not Found
          </span>
          <h2 className="text-xl font-bold text-foreground mt-3">Page Not Found</h2>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            The page you are looking for does not exist or is unavailable. Please check the URL or return to the store.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-2.5 px-4 bg-[#C9A66B] dark:bg-[#D4B483] hover:bg-[#B8914A] dark:hover:bg-[#C49A5A] active:bg-[#A67C3D] text-[#FFFCFA] font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

