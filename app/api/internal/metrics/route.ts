import { registry } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = await registry.metrics();
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": registry.contentType,
      "cache-control": "no-store",
    },
  });
}
