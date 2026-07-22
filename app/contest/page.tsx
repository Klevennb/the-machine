import { redirect } from "next/navigation";
import { getChicagoContestDate } from "@/lib/daily-contest";

export const dynamic = "force-dynamic";

export default function ContestPage() {
  redirect(`/contest/${getChicagoContestDate()}`);
}
