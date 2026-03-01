"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Pencil, RotateCcw } from "lucide-react";
import { ACTION_POLICIES } from "@dungeonbreak/engine";

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

  const agentPolicy = ACTION_POLICIES.policies.find((p) => p.policyId === "agent-play-default");
  const effectiveOrder = priorityOrder ?? agentPolicy?.priorityOrder ?? [];

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
  }, []);

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
                      <button
                        type="button"
                        onClick={() => moveUp(i)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(i)}
                        disabled={i === editingOrder.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyEdit}
                    className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    Apply (use for generation)
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 text-xs">
                {policy.policyId === "agent-play-default" && priorityOrder && (
                  <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    Modified
                  </span>
                )}
                {policy.priorityOrder.map((a) => (
                  <span key={a} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                    {a}
                  </span>
                ))}
                {policy.policyId === "agent-play-default" && (
                  <button
                    type="button"
                    onClick={() => startEdit(policy.policyId)}
                    className="rounded border px-2 py-0.5 text-muted-foreground hover:bg-muted"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {priorityOrder && (
        <button
          type="button"
          onClick={resetToDefault}
          className="flex items-center gap-2 rounded border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RotateCcw className="size-4" /> Reset to default policy
        </button>
      )}

      <div>
        <button
          type="button"
          onClick={onGenerate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          <BarChart3 className="size-4" /> Generate report (uses current policy)
        </button>
      </div>
    </section>
  );
}
