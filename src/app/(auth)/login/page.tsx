import { redirect } from "next/navigation";

export default function LoginPageRedirect() {
  // Legacy route redirect - kept for backwards compatibility
  redirect("/signin");
}
