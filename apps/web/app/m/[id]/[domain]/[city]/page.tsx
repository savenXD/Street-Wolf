import { Suspense } from "react";
import { MobileOutreach } from "@street-wolf/google-maps/mobile";

async function Body({ params }: Pick<PageProps<"/m/[id]/[domain]/[city]">, "params">) {
  const { id, domain, city } = await params;
  return <MobileOutreach id={id} domainId={domain} cityId={city} />;
}

export default function MobileOutreachPage({ params }: PageProps<"/m/[id]/[domain]/[city]">) {
  return (
    <Suspense>
      <Body params={params} />
    </Suspense>
  );
}
