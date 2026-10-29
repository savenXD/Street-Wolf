import { Suspense } from "react";
import { TeamDetail } from "@/components/dashboard/team-detail";

async function Body({ params }: Pick<PageProps<"/dashboard/team/[id]">, "params">) {
  const { id } = await params;
  return <TeamDetail id={id} />;
}

export default function TeamDetailPage({ params }: PageProps<"/dashboard/team/[id]">) {
  return (
    <Suspense>
      <Body params={params} />
    </Suspense>
  );
}
