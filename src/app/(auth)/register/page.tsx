import { redirect } from "next/navigation";

export default function RegisterPageRedirect() {
  // Legacy route redirect - kept for backwards compatibility
  redirect("/signup");
}
