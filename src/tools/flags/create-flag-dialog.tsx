"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFlag } from "./actions";

export function CreateFlagDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createFlag({ name, key, description, reason });
      if (result.ok) {
        setOpen(false);
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
          setName("");
          setKey("");
          setDescription("");
          setReason("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">New flag</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create flag</DialogTitle>
          <DialogDescription>
            New flags start off at 0% rollout. Every change is audited. A
            reason is required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="flag-name">Name</Label>
            <Input
              id="flag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. New checkout flow"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              className="font-mono"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. checkout.new-flow"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-description">Description</Label>
            <Textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What does this flag control, and who owns it?"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="flag-create-reason">Reason for creating</Label>
            <Input
              id="flag-create-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Gating the checkout redesign for a gradual rollout"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isPending || reason.trim() === ""}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
