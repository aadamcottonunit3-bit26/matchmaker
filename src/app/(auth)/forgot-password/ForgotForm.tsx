"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  if (state?.sent) {
    return (
      <Alert tone="success">
        If an account exists for this email address, we have sent a link to reset the password. Please check your
        inbox and your spam folder. The link can be used once and expires soon.
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="Registered email address">
        <Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
