import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDaysUntilEnd,
  getContractStatusClass,
  getContractStatusBg,
  calculateCancellationDeadline,
  parseTerminals,
  terminalStatusLabel,
  terminalStatusClass,
} from "@/lib/contractHelpers";

interface ContractCardProps {
  contractProduct?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  contractTermMonths?: number | null;
  cancellationNoticeDays?: number | null;
  terminalsJson?: string | null;
}

export default function ContractCard({
  contractProduct,
  contractStart,
  contractEnd,
  contractTermMonths,
  cancellationNoticeDays,
  terminalsJson,
}: ContractCardProps) {
  const daysLeft = contractEnd ? getDaysUntilEnd(contractEnd) : null;
  const statusClass = daysLeft !== null ? getContractStatusClass(daysLeft) : "";
  const statusBg = daysLeft !== null ? getContractStatusBg(daysLeft) : "";

  const cancellationDeadline =
    contractEnd && cancellationNoticeDays
      ? calculateCancellationDeadline(contractEnd, cancellationNoticeDays)
      : null;

  const terminals = parseTerminals(terminalsJson);

  const StatusIcon =
    daysLeft === null ? null :
    daysLeft < 0 ? Clock :
    daysLeft < 60 ? AlertTriangle :
    daysLeft < 90 ? Clock :
    CheckCircle2;

  const hasContractData = contractProduct || contractStart || contractEnd || contractTermMonths;

  if (!hasContractData && terminals.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-[#0052CC]" />
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Vertrag &amp; Terminals
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">

        {/* Contract details */}
        {hasContractData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-2.5">
              {contractProduct && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Produkt</p>
                  <p className="text-sm font-semibold text-foreground">{contractProduct}</p>
                </div>
              )}
              {contractTermMonths && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Laufzeit</p>
                  <p className="text-sm font-medium text-foreground">{contractTermMonths} Monate</p>
                </div>
              )}
              {contractStart && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Vertragsbeginn</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(contractStart).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-2.5">
              {contractEnd && daysLeft !== null && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Vertragsende</p>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(contractEnd).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                  {/* Ampel-Badge */}
                  <div className={cn("inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", statusClass, statusBg)}>
                    {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                    {daysLeft < 0
                      ? `Abgelaufen vor ${Math.abs(daysLeft)} Tagen`
                      : daysLeft === 0
                      ? "Läuft heute ab!"
                      : `Noch ${daysLeft} Tage`}
                  </div>
                </div>
              )}
              {cancellationNoticeDays && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Kündigungsfrist</p>
                  <p className="text-sm font-medium text-foreground">{cancellationNoticeDays} Tage</p>
                </div>
              )}
              {cancellationDeadline && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">Kündigungsstichtag</p>
                  <p className={cn("text-sm font-semibold flex items-center gap-1.5",
                    getDaysUntilEnd(cancellationDeadline) < 0
                      ? "text-muted-foreground"
                      : getDaysUntilEnd(cancellationDeadline) < 14
                      ? "text-red-600 dark:text-red-400"
                      : "text-foreground"
                  )}>
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {new Date(cancellationDeadline).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terminals table */}
        {terminals.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Terminals</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Typ</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Anzahl</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((t, i) => (
                    <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-muted/20")}>
                      <td className="px-3 py-2 font-medium text-foreground">{t.type}</td>
                      <td className="px-3 py-2 text-center font-bold text-foreground">{t.count}</td>
                      <td className="px-3 py-2">
                        <span className={cn("text-xs font-semibold", terminalStatusClass(t.status))}>
                          {terminalStatusLabel(t.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
