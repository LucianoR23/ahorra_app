import { AdminAccountDetail } from "@/components/admin/admin-account-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminAccountDetail id={id} />;
}
