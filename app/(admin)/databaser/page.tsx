import { osloToday } from "@/lib/mock/clock";
import { getDatabaseOverview } from "./data";
import { DatabaserView } from "./DatabaserView";

// Root layout applies the "%s · nEESSI admin" title template.
export const metadata = { title: "Databaser" };

export default function Page() {
  const overview = getDatabaseOverview(osloToday());
  return <DatabaserView overview={overview} />;
}
