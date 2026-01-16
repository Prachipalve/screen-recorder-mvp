import ShareClient from "./ShareClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShareClient id={id} />;
}
