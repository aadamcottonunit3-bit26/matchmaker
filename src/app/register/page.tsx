import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { PageContainer, PageTitle } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create your profile" };

export default async function RegisterPage() {
  if (await getUser()) redirect("/dashboard");
  return (
    <PageContainer className="max-w-3xl">
      <PageTitle
        title="Create your profile"
        subtitle="Our team manually verifies every profile before it goes live."
      />
      <RegisterForm />
    </PageContainer>
  );
}
