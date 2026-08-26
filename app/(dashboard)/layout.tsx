import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, companies!companies_profile_id_fkey(status)")
    .eq("id", user.id)
    .maybeSingle();

  const company = profile?.companies as { status: string } | null;

  if (profile?.role === "company" && company?.status === "pending") {
    redirect("/pending-approval");
  }

  if (profile?.role === "company" && company?.status === "rejected") {
    redirect("/pending-approval?status=rejected");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <span className="font-semibold">EvenTeam</span>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
