import { requireAdmin } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
