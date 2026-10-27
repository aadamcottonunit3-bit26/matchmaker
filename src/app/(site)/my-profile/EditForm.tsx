"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { updateProfile } from "./actions";
import { ProfileFields } from "@/components/ProfileFields";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { compressFormImages } from "@/lib/client-image";

export function EditForm({ profile, dob }: { profile: Profile; dob: string | null }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const [preparing, setPreparing] = useState(false);
  const msgRef = useRef<HTMLDivElement>(null);

  // The save button is at the bottom of a long form: bring the result message into view.
  useEffect(() => {
    if (state) msgRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPreparing(true);
    await compressFormImages(fd, ["photo"]);
    setPreparing(false);
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div ref={msgRef} className="scroll-mt-28">
        {state?.error && <Alert tone="error">{state.error}</Alert>}
        {state?.ok && <Alert tone="success">✓ Your profile was updated successfully.</Alert>}
      </div>
      {profile.is_verified && (
        <Alert tone="info">Your name, gender and date of birth are locked because your profile is verified. Contact support to change them.</Alert>
      )}
      <ProfileFields defaults={{ ...profile, dob }} />
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
      <Button type="submit" size="lg" disabled={pending || preparing}>{preparing ? "Preparing photo…" : pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
