"use client";

import { useActionState } from "react";
import { updatePassword } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="New password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
