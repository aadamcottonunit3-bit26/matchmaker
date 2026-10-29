import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { RESET_MARKER } from "@/lib/password-reset";
import { Card } from "@/components/ui";
import { ResetForm } from "./ResetForm";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The page only opens after a valid reset link (marker cookie + the session that link created)
  const marker = (await cookies()).get(RESET_MARKER)?.value;
  const user = marker === "1" ? await getUser() : null;
  if (!user) redirect("/forgot-password?error=invalid");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-1 text-2xl font-bold">Choose a new password</h1>
        <p className="mb-6 text-sm text-stone-600">Enter a new password for your account.</p>
        <ResetForm />
      </Card>
    </div>
  );
}
