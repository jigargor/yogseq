"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSequenceAction,
  duplicateSequenceAction,
  publishShareLinkAction,
} from "@/app/actions/sequences";
import { Button } from "@/components/ui/button";

interface SequenceActionsProps {
  id: string;
  title: string;
  shareSlug: string | null;
}

export function SequenceActions({ id, title, shareSlug }: SequenceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateSequenceAction(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Sequence duplicated");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete “${title}”? You can't undo this.`)) return;
    startTransition(async () => {
      const result = await deleteSequenceAction(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Sequence deleted");
      router.refresh();
    });
  }

  function handleShare() {
    startTransition(async () => {
      const result = await publishShareLinkAction(id);
      if (!result.ok) return void toast.error(result.error);
      const url = `${window.location.origin}/s/${result.data.shareSlug}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied", { description: url });
      } catch {
        toast.success("Share link ready", { description: url });
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button asChild size="sm" variant="default">
        <Link href={`/builder?sequence=${encodeURIComponent(id)}`}>
          <Pencil /> Open in builder
        </Link>
      </Button>
      <Button size="sm" variant="outline" onClick={handleShare} disabled={isPending}>
        <Share2 /> {shareSlug ? "Copy link" : "Share"}
      </Button>
      {shareSlug ? (
        <Button asChild size="icon-sm" variant="ghost" aria-label="Open public page">
          <Link href={`/s/${shareSlug}`} target="_blank">
            <ExternalLink />
          </Link>
        </Button>
      ) : null}
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleDuplicate}
        disabled={isPending}
        aria-label="Duplicate sequence"
      >
        <Copy />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Delete sequence"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
