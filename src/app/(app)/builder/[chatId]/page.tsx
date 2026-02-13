import { redirect } from "next/navigation";

type BuilderPageRedirectProps = {
  params: Promise<{ chatId: string }>;
};

export default async function BuilderPageRedirect({
  params,
}: BuilderPageRedirectProps) {
  const { chatId } = await params;
  redirect(`/chat/${chatId}`);
}
