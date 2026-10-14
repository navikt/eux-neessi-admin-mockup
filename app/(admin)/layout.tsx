import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { getSessionUser } from "@/lib/auth";
import { getAwaiting, summarizeAwaiting } from "@/lib/mock/awaiting";
import { osloToday } from "@/lib/mock/clock";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const summary = summarizeAwaiting(getAwaiting(osloToday()));

  return (
    <div className="shell">
      <Sidebar badges={{ overdue: summary.overdue }} />
      <div className="shell__main">
        <Topbar user={user} />
        <main id="main" className="shell__content">
          {children}
        </main>
      </div>
    </div>
  );
}
