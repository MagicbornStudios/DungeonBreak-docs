"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingStatImpactAction } from "@/components/reports/content-creator/use-stat-impact-dialog-state";

type StatImpactDialogProps = {
  pendingStatImpactAction: PendingStatImpactAction | null;
  pendingStatImpactChoice: "delete" | "replace";
  pendingStatImpactReplacementId: string;
  statModelIds: string[];
  onSetPendingStatImpactChoice: (next: "delete" | "replace") => void;
  onSetPendingStatImpactReplacementId: (next: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function StatImpactDialog({
  pendingStatImpactAction,
  pendingStatImpactChoice,
  pendingStatImpactReplacementId,
  statModelIds,
  onSetPendingStatImpactChoice,
  onSetPendingStatImpactReplacementId,
  onClose,
  onSubmit,
}: StatImpactDialogProps) {
  return (
    <Dialog
      open={!!pendingStatImpactAction}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="z-[260] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pendingStatImpactAction?.title ?? "Confirm stat impact"}</DialogTitle>
          <DialogDescription>{pendingStatImpactAction?.description ?? ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1 text-xs">
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-2">
            <input
              type="radio"
              name="stat-impact-strategy"
              checked={pendingStatImpactChoice === "delete"}
              onChange={() => onSetPendingStatImpactChoice("delete")}
              className="mt-0.5"
            />
            <span className="space-y-0.5">
              <span className="block font-medium text-foreground">Delete impacted canonical assets</span>
              <span className="block text-muted-foreground">
                Delete canonical assets tied to impacted models
                {pendingStatImpactAction ? ` (${pendingStatImpactAction.impactedCanonicalCount}).` : "."}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded border border-border p-2">
            <input
              type="radio"
              name="stat-impact-strategy"
              checked={pendingStatImpactChoice === "replace"}
              onChange={() => onSetPendingStatImpactChoice("replace")}
              className="mt-0.5"
            />
            <span className="flex-1 space-y-1">
              <span className="block font-medium text-foreground">Replace/remap to stat set</span>
              <span className="block text-muted-foreground">
                Re-link impacted models to another stat set and remap feature refs.
              </span>
              <select
                value={pendingStatImpactReplacementId}
                onChange={(event) => onSetPendingStatImpactReplacementId(event.target.value)}
                className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-[11px] text-foreground"
                disabled={pendingStatImpactChoice !== "replace"}
              >
                <option value="">Select stat set</option>
                {statModelIds
                  .filter((statModelId) => statModelId !== pendingStatImpactAction?.oldStatId)
                  .map((statModelId) => (
                    <option key={`replace-stat-option:${statModelId}`} value={statModelId}>
                      {statModelId}
                    </option>
                  ))}
              </select>
            </span>
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={pendingStatImpactChoice === "replace" && !pendingStatImpactReplacementId}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
