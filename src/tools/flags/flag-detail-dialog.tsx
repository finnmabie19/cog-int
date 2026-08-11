"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { HistoryEntry } from "./history";
import { setRollout, toggleFlag } from "./actions";

/** Serializable flag shape the server page hands to this dialog. */
export interface FeatureFlagView {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  lastChangedByName: string | null;
  lastChangedAt: string | null;
  history: HistoryEntry[];
}

export function FlagDetailDialog({
  flag,
  canMutate,
}: {
  flag: FeatureFlagView;
  canMutate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rollout, setRolloutValue] = useState(String(flag.rolloutPercentage));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reasonMissing = reason.trim() === "";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setReason("");
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setReason("");
          setRolloutValue(String(flag.rolloutPercentage));
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{flag.name}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{flag.key}</span> · {flag.enabled ? "On" : "Off"} ·{" "}
            {flag.rolloutPercentage}% rollout
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Description</p>
            <p>{flag.description}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Last changed</p>
            <p>
              {flag.lastChangedByName
                ? `${flag.lastChangedByName}${flag.lastChangedAt ? ` on ${flag.lastChangedAt}` : ""}`
                : "Never changed"}
            </p>
          </div>

          <Separator />

          <div>
            <p className="mb-2 font-medium">Flag history</p>
            {flag.history.length === 0 && (
              <p className="text-muted-foreground">
                Nothing has happened on this flag yet.
              </p>
            )}
            <ol className="grid gap-3">
              {flag.history.map((entry) => (
                <li key={entry.id} className="rounded-md border p-3">
                  <p>{entry.summary}</p>
                  <p className="text-muted-foreground">
                    {entry.when} — “{entry.reason}”
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {canMutate && (
            <>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor={`flag-reason-${flag.id}`}>
                  Reason (required for any action)
                </Label>
                <Input
                  id={`flag-reason-${flag.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Enabling for the beta cohort per rollout plan"
                />
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    size="sm"
                    variant={flag.enabled ? "destructive" : "default"}
                    disabled={isPending || reasonMissing}
                    onClick={() =>
                      run(() =>
                        toggleFlag({
                          flagId: flag.id,
                          enabled: !flag.enabled,
                          reason,
                        }),
                      )
                    }
                  >
                    Turn {flag.enabled ? "off" : "on"}
                  </Button>
                  <div className="flex items-end gap-2">
                    <div className="grid gap-1">
                      <Label
                        htmlFor={`flag-rollout-${flag.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Rollout %
                      </Label>
                      <Input
                        id={`flag-rollout-${flag.id}`}
                        className="w-20"
                        type="number"
                        min={0}
                        max={100}
                        value={rollout}
                        onChange={(e) => setRolloutValue(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending || reasonMissing}
                      onClick={() =>
                        run(() =>
                          setRollout({
                            flagId: flag.id,
                            rolloutPercentage: Number(rollout),
                            reason,
                          }),
                        )
                      }
                    >
                      Set rollout
                    </Button>
                  </div>
                </div>
                {error && <p className="text-destructive">{error}</p>}
              </div>
            </>
          )}

          {!canMutate && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <Badge variant="outline">Read-only</Badge>
                <p className="text-muted-foreground">
                  Your roles allow viewing this flag but not changing it.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
