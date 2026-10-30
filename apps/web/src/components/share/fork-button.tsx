"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { forkSequenceAction } from "@/app/actions/sequences";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface ForkButtonProps {
  shareSlug: string;
}

export function ForkButton({ shareSlug }: ForkButtonProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [isPending, startTransition] = useTransition();

  if (!session && !isSessionPending)
    return (
      <Button asChild>
        <Link href={`/sign-in?next=${encodeURIComponent(`/s/${shareSlug}`)}`}>
          <CopyPlus /> Copy to my library
        </Link>
      </Button>
    );

  function handleFork() {
    startTransition(async () => {
      const result = await forkSequenceAction(shareSlug);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Copied to your library");
      router.push("/library");
    });
  }

  return (
    <Button onClick={handleFork} disabled={isPending || isSessionPending}>
      <CopyPlus /> {isPending ? "Copying…" : "Copy to my library"}
    </Button>
  );
}
