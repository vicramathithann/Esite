export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-semibold border-r border-border pr-5 text-foreground">
          404
        </h1>
        <p className="text-sm text-muted">
          This page could not be found.
        </p>
      </div>
    </div>
  );
}
