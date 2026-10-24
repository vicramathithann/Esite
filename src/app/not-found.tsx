import ErrorView from "@/components/ErrorView";

export default function NotFound() {
  return (
    <ErrorView
      code="404"
      title="PAGE NOT FOUND"
      primaryButtonText="Return Home"
      primaryButtonHref="/"
    />
  );
}
