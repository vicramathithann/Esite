import ErrorView from "@/components/ErrorView";

export default function NotFound() {
  return (
    <ErrorView
      code="404"
      primaryButtonText="Return Home"
      primaryButtonHref="/"
    />
  );
}
