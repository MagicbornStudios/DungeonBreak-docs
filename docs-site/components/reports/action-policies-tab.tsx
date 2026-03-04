"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Pencil, RotateCcw } from "lucide-react";
import { ACTION_POLICIES } from "@dungeonbreak/engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ActionPoliciesTabProps = {
  priorityOrder: string[] | null;
  onPriorityOrderChange: (order: string[] | null) => void;
  onGenerate: () => void;
};

export function ActionPoliciesTab({
  priorityOrder,
  onPriorityOrderChange,
  onGenerate,
}: ActionPoliciesTabProps) {
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<string[]>([]);

  const startEdit = useCallback((policyId: string) => {
    const policy = ACTION_POLICIES.policies.find((p) => p.policyId === policyId);
    if (policy) {
      setEditingPolicyId(policyId);
      setEditingOrder([...policy.priorityOrder]);
    }
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setEditingOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    if (index >= editingOrder.length - 1) return;
    setEditingOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      return next;
    });
  }, [editingOrder.length]);

  const applyEdit = useCallback(() => {
    onPriorityOrderChange(editingOrder);
    setEditingPolicyId(null);
  }, [editingOrder, onPriorityOrderChange]);

  const cancelEdit = useCallback(() => {
    setEditingPolicyId(null);
  }, []);

  const resetToDefault = useCallback(() => {
    onPriorityOrderChange(null);
  }, [onPriorityOrderChange]);

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Pencil className="size-4" /> Action Policies
      </h2>
      <p className="text-sm text-muted-foreground">
        Policies define action priority for NPCs and agent play. Edit agent-play-default to change the order used when generating reports in the browser. Changes apply to this session only.
      </p>

      <div className="space-y-4">
        {ACTION_POLICIES.policies.map((policy) => (
          <div
            key={policy.policyId}
            className="rounded-lg border bg-muted/20 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{policy.label}</h3>
              <span className="text-xs text-muted-foreground">
                {policy.entityKindFilter.join(", ")}
              </span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              {policy.policyId}
            </p>
            {editingPolicyId === policy.policyId ? (
              <div className="space-y-2">
                <ul className="space-y-1 text-sm">
                  {editingOrder.map((actionType, i) => (
                    <li key={`${actionType}-${i}`} className="flex items-center gap-2">
                      <span className="font-mono">{actionType}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="size-6"
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => moveDown(i)}
                        disabled={i === editingOrder.length - 1}
                        className="size-6"
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={applyEdit}>
                    Apply (use for generation)
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 text-xs">
                {policy.policyId === "agent-play-default" && priorityOrder && (
                  <Badge variant="secondary" className="mr-2">
                    Modified
                  </Badge>
                )}
                {policy.priorityOrder.map((a) => (
                  <Badge key={a} variant="outline" className="font-mono">
                    {a}
                  </Badge>
                ))}
                {policy.policyId === "agent-play-default" && (
                  <Button type="button" size="sm" variant="outline" onClick={() => startEdit(policy.policyId)}>
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {priorityOrder && (
        <Button type="button" variant="outline" onClick={resetToDefault}>
          <RotateCcw className="size-4" /> Reset to default policy
        </Button>
      )}

      <div>
        <Button type="button" onClick={onGenerate}>
          <BarChart3 className="size-4" /> Generate report (uses current policy)
        </Button>
      </div>
    </section>
  );
}
