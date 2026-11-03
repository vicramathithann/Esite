import ErrorScreen from "@/components/ErrorScreen";

export default function Unauthorized() {
  return (
    <ErrorScreen
      code="401"
      primaryAction={{
        label: "Sign In",
        href: "/login",
      }}
      secondaryAction={{
        label: "Return Home",
        href: "/",
      }}
    />
  );
}

