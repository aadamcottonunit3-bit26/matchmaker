import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-1 text-2xl font-bold">Forgot your password?</h1>
        <p className="mb-6 text-sm text-stone-600">
          Enter the email address you registered with and we will send you a link to choose a new password.
        </p>
        {error === "invalid" && (
          <div className="mb-4">
            <Alert tone="error">This reset link is invalid, has expired or was already used. Please request a new one.</Alert>
          </div>
        )}
        <ForgotForm />
        <p className="mt-6 text-center text-sm text-stone-600">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-rose-700 hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}
