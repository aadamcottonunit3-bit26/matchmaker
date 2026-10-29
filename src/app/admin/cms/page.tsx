import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { cmsMediaUrl } from "@/lib/cms";
import { formatDate } from "@/lib/utils";
import type { Plan } from "@/lib/types";
import { Badge, Button, Card, Field, Input, PageContainer, PageTitle, Select, TabNav, Textarea } from "@/components/ui";
import { createSlider, deleteSlider, savePage, savePlan, toggleSlider } from "./actions";

export const metadata = { title: "Admin · CMS" };

const TABS = [
  { key: "sliders", label: "Home images" },
  { key: "pages", label: "Static pages" },
  { key: "plans", label: "Pricing / packages" },
];

function PlanForm({ plan }: { plan?: Plan }) {
  return (
    <form action={savePlan} className="grid gap-3 sm:grid-cols-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <Field label="Name"><Input name="name" defaultValue={plan?.name} required /></Field>
      <Field label="Tier">
        <Select name="tier" defaultValue={plan?.tier ?? "verified"} options={[{ value: "free", label: "Free" }, { value: "verified", label: "Verified" }, { value: "vip", label: "VIP" }]} />
      </Field>
      <Field label="Price (PKR)"><Input name="price_pkr" type="number" min={0} defaultValue={plan?.price_pkr ?? 0} /></Field>
      <Field label="Duration (days)"><Input name="duration_days" type="number" min={1} defaultValue={plan?.duration_days ?? 30} /></Field>
      <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={plan?.sort_order ?? 0} /></Field>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={plan?.is_active ?? true} className="accent-rose-700" /> Active</label>
      <div className="sm:col-span-3">
        <Field label="Features (one per line)"><Textarea name="features" defaultValue={(plan?.features ?? []).join("\n")} /></Field>
      </div>
      <div className="sm:col-span-3"><Button size="sm">{plan ? "Save plan" : "Add plan"}</Button></div>
    </form>
  );
}

export default async function AdminCms({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab: raw } = await searchParams;
  const tab = TABS.some((t) => t.key === raw) ? raw! : "sliders";
  const supabase = await createClient();

  const [{ data: sliders }, { data: pages }, { data: plans }] = await Promise.all([
    supabase.from("cms_sliders").select("*").order("sort_order"),
    supabase.from("cms_pages").select("*").order("slug"),
    supabase.from("plans").select("*").order("sort_order"),
  ]);

  return (
    <PageContainer className="max-w-4xl">
      <PageTitle title="Content management" subtitle="Everything shown on the public site is controlled from here." />
      <TabNav basePath="/admin/cms" active={tab} tabs={TABS} />

      {tab === "sliders" && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-1 font-semibold">Add a home page image</h2>
            <p className="mb-3 text-sm text-stone-600">
              The home page already looks complete without images. Add images only if you want them.
              Upload only photos you have permission to use.
            </p>
            <form action={createSlider} className="grid gap-3 sm:grid-cols-2">
              <Field label="Where to show it">
                <Select
                  name="placement"
                  defaultValue="hero"
                  options={[
                    { value: "hero", label: "Top banner (big slider at the top)" },
                    { value: "gallery", label: "Photo gallery (families section)" },
                  ]}
                />
              </Field>
              <Field label="Title (optional)"><Input name="title" /></Field>
              <Field label="Subtitle (optional)"><Input name="subtitle" /></Field>
              <Field label="Link (optional)"><Input name="link_url" placeholder="/register" /></Field>
              <Field label="Sort order"><Input name="sort_order" type="number" defaultValue={0} /></Field>
              <Field label="Image (wide, JPG/PNG/WebP, max 5 MB)"><Input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></Field>
              <div className="flex items-end"><Button>Upload image</Button></div>
            </form>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {(sliders ?? []).map((s) => (
              <Card key={s.id} className="space-y-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cmsMediaUrl(s.image_path)} alt="" className="h-36 w-full rounded-lg object-cover" />
                <p className="font-medium">{s.title || "(no title)"}{" "}
                  <Badge tone={s.is_active ? "green" : "gray"}>{s.is_active ? "Live" : "Hidden"}</Badge>{" "}
                  <Badge tone="blue">{s.placement === "gallery" ? "Gallery" : "Top banner"}</Badge>
                </p>
                <div className="flex gap-2">
                  <form action={toggleSlider}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.is_active)} />
                    <Button variant="secondary" size="sm">{s.is_active ? "Hide" : "Show"}</Button>
                  </form>
                  <form action={deleteSlider}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button variant="danger" size="sm">Delete</Button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "pages" && (
        <div className="space-y-6">
          {(pages ?? []).map((p) => (
            <Card key={p.id}>
              <form action={savePage} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">/{p.slug}</h2>
                  <span className="text-xs text-stone-500">Updated {formatDate(p.updated_at)}</span>
                </div>
                <Field label="Title"><Input name="title" defaultValue={p.title} required /></Field>
                <Field label="Content" hint="Separate paragraphs with a blank line. Start a line with “## ” for a heading.">
                  <Textarea name="content" defaultValue={p.content_md} className="min-h-48" />
                </Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={p.is_published} className="accent-rose-700" /> Published</label>
                <Button size="sm">Save page</Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      {tab === "plans" && (
        <div className="space-y-6">
          {(plans as Plan[] | null ?? []).map((p) => (
            <Card key={p.id}><PlanForm plan={p} /></Card>
          ))}
          <Card><h2 className="mb-3 font-semibold">Add new package</h2><PlanForm /></Card>
        </div>
      )}
    </PageContainer>
  );
}
