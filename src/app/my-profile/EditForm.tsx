"use client";

import { startTransition, useActionState } from "react";
import { updateProfile } from "./actions";
import { ProfileFields } from "@/components/ProfileFields";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function EditForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.ok && <Alert tone="success">Profile saved.</Alert>}
      {profile.is_verified && (
        <Alert tone="info">Your name, gender and date of birth are locked because your profile is verified. Contact support to change them.</Alert>
      )}
      <ProfileFields defaults={profile} />
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Photo privacy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Replace photo (optional)">
            <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          </Field>
          <label className="flex items-start gap-2 self-end rounded-lg bg-stone-50 p-3 text-sm">
            <input type="checkbox" name="blur_photo" defaultChecked={profile.blur_photo} className="mt-0.5 accent-rose-700" />
            <span><b>Blur my photo.</b> Members must request access and I approve them.</span>
          </label>
        </div>
      </Card>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
