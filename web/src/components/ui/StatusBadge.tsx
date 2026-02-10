import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  RETRY_SCHEDULED: "bg-orange-100 text-orange-800 border-orange-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status] || styles.PENDING)}>
      {status}
    </span>
  );
}