import { redirect } from "next/navigation";

type ContributePageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ContributePage({
  searchParams,
}: ContributePageProps) {
  const params = await searchParams;
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  redirect(tab === "prompt" || tab === "prompts" ? "/submit-prompt" : "/feedback");
}
