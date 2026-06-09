import { getRiskInfo, getRiskBadgeClass } from "@/lib/riskScoring";
import { cn } from "@/lib/utils";

interface RiskScoreCardProps {
  score: number;
  reasons?: string[];
  showReasons?: boolean;
  size?: "sm" | "md";
}

export function RiskScoreCard({ score, reasons = [], showReasons = false, size = "md" }: RiskScoreCardProps) {
  const info = getRiskInfo(score);

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold",
          getRiskBadgeClass(score)
        )}
        title={reasons.length > 0 ? reasons.join(" · ") : info.label}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: info.color }}
        />
        {score}
      </span>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3", info.bgColor, info.borderColor)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: info.color }}
          />
          <span className={cn("text-sm font-bold", info.textColor)}>{info.label}</span>
        </div>
        <span className={cn("text-2xl font-black", info.textColor)}>{score}</span>
      </div>

      {/* Score bar */}
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: info.color }}
        />
      </div>

      {showReasons && reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i} className={cn("text-[11px]", info.textColor)}>
              • {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
