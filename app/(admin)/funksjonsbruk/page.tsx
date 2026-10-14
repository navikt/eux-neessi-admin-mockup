import { osloToday } from "@/lib/mock/clock";
import { getAdoptionData } from "./data";
import { FunksjonsbrukView } from "./FunksjonsbrukView";

export const metadata = { title: "Funksjonsbruk" };

export default function Page() {
  const today = osloToday();
  return <FunksjonsbrukView data={getAdoptionData(today)} />;
}
