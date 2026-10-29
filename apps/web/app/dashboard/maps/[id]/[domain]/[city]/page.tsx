import { Suspense } from "react";
import { MapsSheet } from "@/components/dashboard/maps-sheet";

async function Body({ params }: Pick<PageProps<"/dashboard/maps/[id]/[domain]/[city]">, "params">) {
  const { id, domain, city } = await params;
  return <MapsSheet id={id} domainId={domain} cityId={city} />;
}

export default function MapsSheetPage({ params }: PageProps<"/dashboard/maps/[id]/[domain]/[city]">) {
  return (
    <Suspense>
      <Body params={params} />
    </Suspense>
  );
}
