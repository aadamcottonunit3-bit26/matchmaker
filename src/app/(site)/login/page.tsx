import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, getUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { Alert, Card } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  const target = safeNext(next);
  if (await getUser()) {
    const me = await getMe();
    redirect(me?.role === "admin" ? "/admin" : target);
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Card>
        <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-stone-600">Login to see your matches and messages.</p>
        {reset === "success" && (
          <div className="mb-4">
            <Alert tone="success">Your password was changed. Please log in with your new password.</Alert>
          </div>
        )}
        <LoginForm next={target} />
        <p className="mt-6 text-center text-sm text-stone-600">
          New here?{" "}
          <Link href="/register" className="font-medium text-rose-700 hover:underline">
            Create your profile
          </Link>
        </p>
      </Card>
    </div>
  );
}
