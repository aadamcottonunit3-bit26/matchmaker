import { notFound } from "next/navigation";
import { getPage } from "@/lib/cms";
import { PageContainer } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  return { title: page?.title ?? "Page" };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  // Plain-text rendering (paragraphs preserved): safe against injected HTML/scripts.
  const blocks = String(page.content_md).split(/\n{2,}/);
  return (
    <PageContainer className="max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">{page.title}</h1>
      <div className="space-y-4 text-stone-700">
        {blocks.map((b, i) =>
          b.startsWith("## ") ? (
            <h2 key={i} className="pt-2 text-xl font-semibold text-stone-900">{b.slice(3)}</h2>
          ) : (
            <p key={i} className="whitespace-pre-line leading-relaxed">{b}</p>
          )
        )}
      </div>
    </PageContainer>
  );
}
