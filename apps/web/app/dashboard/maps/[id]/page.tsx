import { Suspense } from "react";
import { MapsHome } from "@street-wolf/google-maps/web";

async function Body({ params }: Pick<PageProps<"/dashboard/maps/[id]">, "params">) {
  const { id } = await params;
  return <MapsHome id={id} />;
}

export default function MapsPage({ params }: PageProps<"/dashboard/maps/[id]">) {
  return (
    <Suspense>
      <Body params={params} />
    </Suspense>
  );
}
