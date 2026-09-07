import Link from "next/link";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <nav className="flex gap-4 border-b pb-3 text-sm">
        <Link href="/settings/profile" className="text-gray-600 hover:text-black">
          Profile
        </Link>
        <Link href="/settings/company" className="text-gray-600 hover:text-black">
          Company
        </Link>
        <Link href="/settings/security" className="text-gray-600 hover:text-black">
          Security
        </Link>
      </nav>
      {children}
    </div>
  );
}
