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
import { approveCase, claimCase, rejectCase, releaseCase } from "./actions";

/** Serializable case shape the server page hands to this dialog. */
export interface KycCaseView {
  id: string;
  customerName: string;
  customerEmail: string;
  dateOfBirth: string;
  country: string;
  documentType: string;
  documentNumber: string;
  riskSignals: string[];
  status: string;
  submittedAt: string;
  claimedBy: string | null;
  claimedByName: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  history: HistoryEntry[];
}

export function CaseDetailDialog({
  kycCase,
  canReview,
  userEmail,
}: {
  kycCase: KycCaseView;
  canReview: boolean;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPendingCase = kycCase.status === "pending";
  const claimedByMe = kycCase.claimedBy === userEmail;
  const reasonMissing = reason.trim() === "";

  function run(
    action: (input: { caseId: string; reason: string }) => Promise<{
      ok: boolean;
      error?: string;
    }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action({ caseId: kycCase.id, reason });
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
          <DialogTitle>{kycCase.customerName}</DialogTitle>
          <DialogDescription>
            Submitted {kycCase.submittedAt} · Status: {kycCase.status}
            {kycCase.claimedByName && isPendingCase
              ? ` · Claimed by ${kycCase.claimedByName}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p>{kycCase.customerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date of birth</p>
              <p>{kycCase.dateOfBirth}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Country</p>
              <p>{kycCase.country}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Document</p>
              <p>
                {kycCase.documentType} · {kycCase.documentNumber}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">Risk signals</p>
            <div className="flex flex-wrap gap-1">
              {kycCase.riskSignals.map((signal) => (
                <Badge key={signal} variant="secondary">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-muted-foreground">Submitted documents</p>
            <div className="flex gap-2">
              <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                {kycCase.documentType} (front)
              </div>
              <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                {kycCase.documentType} (back)
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 font-medium">Case history</p>
            {kycCase.history.length === 0 && (
              <p className="text-muted-foreground">
                Nothing has happened on this case yet.
              </p>
            )}
            <ol className="grid gap-3">
              {kycCase.history.map((entry) => (
                <li key={entry.id} className="rounded-md border p-3">
                  <p>{entry.summary}</p>
                  <p className="text-muted-foreground">
                    {entry.when} — “{entry.reason}”
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {canReview && isPendingCase && (
            <>
              <Separator />
              <div className="grid gap-2">
                <Label htmlFor={`kyc-reason-${kycCase.id}`}>
                  Reason (required for any action)
                </Label>
                <Input
                  id={`kyc-reason-${kycCase.id}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Document number does not match the registry"
                />
                <div className="flex flex-wrap gap-2">
                  {!kycCase.claimedBy && (
                    <Button
                      size="sm"
                      disabled={isPending || reasonMissing}
                      onClick={() => run(claimCase)}
                    >
                      Claim
                    </Button>
                  )}
                  {claimedByMe && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || reasonMissing}
                        onClick={() => run(releaseCase)}
                      >
                        Release
                      </Button>
                      <Button
                        size="sm"
                        disabled={isPending || reasonMissing}
                        onClick={() => run(approveCase)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending || reasonMissing}
                        onClick={() => run(rejectCase)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {kycCase.claimedBy && !claimedByMe && (
                    <p className="text-muted-foreground">
                      Claimed by {kycCase.claimedByName} — only they can decide
                      or release it.
                    </p>
                  )}
                </div>
                {error && <p className="text-destructive">{error}</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
