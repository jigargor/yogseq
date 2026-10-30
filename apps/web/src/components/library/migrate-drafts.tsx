"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { createSequenceAction } from "@/app/actions/sequences";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  dismissMigration,
  isMigrationDismissed,
  markDraftsMigrated,
  readLocalDrafts,
  type LocalDraft,
} from "@/lib/local-drafts";

/** Offers to upload sequences saved in this browser (IndexedDB) to the signed-in library. */
export function MigrateDrafts() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isMigrationDismissed()) return;
    let isCancelled = false;
    void readLocalDrafts().then((found) => {
      if (!isCancelled) setDrafts(found);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  if (drafts.length === 0) return null;

  function handleUpload() {
    startTransition(async () => {
      const uploaded: string[] = [];
      let failures = 0;
      for (const draft of drafts) {
        const result = await createSequenceAction({
          title: draft.title,
          description: draft.description,
          level: draft.level,
          style: draft.style,
          targetMinutes: draft.targetMinutes,
          tags: draft.tags,
          items: draft.items,
        });
        if (result.ok) uploaded.push(draft.key);
        else failures += 1;
      }

      markDraftsMigrated(uploaded);
      setDrafts((current) => current.filter((draft) => !uploaded.includes(draft.key)));
      if (uploaded.length > 0) toast.success(`Saved ${uploaded.length} sequence(s) to your library`);
      if (failures > 0) toast.error(`${failures} draft(s) could not be uploaded`);
      router.refresh();
    });
  }

  function handleDismiss() {
    dismissMigration();
    setDrafts([]);
  }

  return (
    <Alert>
      <CloudUpload />
      <AlertTitle>
        {drafts.length === 1
          ? "1 draft found on this device"
          : `${drafts.length} drafts found on this device`}
      </AlertTitle>
      <AlertDescription className="gap-3">
        <p>Save them to your library so they&apos;re backed up and available everywhere.</p>
        <ul className="list-disc pl-5">
          {drafts.slice(0, 5).map((draft) => (
            <li key={draft.key}>{draft.title}</li>
          ))}
          {drafts.length > 5 ? <li>…and {drafts.length - 5} more</li> : null}
        </ul>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleUpload} disabled={isPending}>
            {isPending ? "Saving…" : "Save to my library"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss} disabled={isPending}>
            Not now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
