import Link from "next/link";
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

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center gap-6 border-b px-6 py-4">
        <span className="font-semibold">EvenTeam</span>
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-black">
            Dashboard
          </Link>
          <Link href="/events" className="text-gray-600 hover:text-black">
            Events
          </Link>
          <Link href="/templates" className="text-gray-600 hover:text-black">
            Templates
          </Link>
          <Link href="/email-templates" className="text-gray-600 hover:text-black">
            Email Templates
          </Link>
          {isAdmin && (
            <Link href="/companies" className="text-gray-600 hover:text-black">
              Companies
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
