"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { register } from "./actions";
import { ProfileFields } from "@/components/ProfileFields";
import { Alert, Card, Field, Input } from "@/components/ui";
import { Button } from "@/components/ui";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  const errRef = useRef<HTMLDivElement>(null);

  // Submit manually so a validation error does not reset the (long) form or the chosen files.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  useEffect(() => {
    if (state?.error) errRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div ref={errRef}>{state?.error && <Alert tone="error">{state.error}</Alert>}</div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Mobile number" hint="Visible only to the admin.">
            <Input name="phone" type="tel" placeholder="03XX-XXXXXXX" />
          </Field>
        </div>
      </Card>

      <ProfileFields />

      <Card>
        <h2 className="mb-1 text-lg font-semibold">Identity verification &amp; photo</h2>
        <p className="mb-4 text-sm text-stone-600">
          Your CNIC is stored privately and is only seen by our admin team to verify your profile. It is never shown to other members.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CNIC number" hint="Format: 12345-1234567-1">
            <Input name="cnic_number" required pattern="\d{5}-\d{7}-\d" placeholder="12345-1234567-1" inputMode="numeric" />
          </Field>
          <div />
          <Field label="CNIC — front (image)">
            <Input name="cnic_front" type="file" accept="image/jpeg,image/png,image/webp" required />
          </Field>
          <Field label="CNIC — back (image)">
            <Input name="cnic_back" type="file" accept="image/jpeg,image/png,image/webp" required />
          </Field>
          <Field label="Your photo">
            <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
          </Field>
          <label className="flex items-start gap-2 self-end rounded-lg bg-stone-50 p-3 text-sm">
            <input type="checkbox" name="blur_photo" className="mt-0.5 accent-rose-700" />
            <span>
              <b>Blur my photo.</b> Members must send a photo request and I approve who can see it.
            </span>
          </label>
        </div>
      </Card>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" required className="mt-0.5 accent-rose-700" />
        <span>
          I confirm the information is true and I accept the{" "}
          <a href="/terms-and-conditions" target="_blank" className="text-rose-700 underline">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" target="_blank" className="text-rose-700 underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Creating your profile…" : "Create my profile"}
      </Button>
    </form>
  );
}
