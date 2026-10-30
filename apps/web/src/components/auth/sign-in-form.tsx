"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignInFormProps {
  callbackURL: string;
  googleEnabled: boolean;
}

type FormStatus = "idle" | "sending" | "sent" | "error";

export function SignInForm({ callbackURL, googleEnabled }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);
    const { error } = await authClient.signIn.magicLink({ email, callbackURL });
    if (error) {
      setStatus("error");
      setMessage(error.message ?? "Could not send the sign-in link. Please try again.");
      return;
    }
    setStatus("sent");
  }

  async function handleGoogle() {
    setIsGoogleLoading(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (error) {
      setIsGoogleLoading(false);
      setStatus("error");
      setMessage(error.message ?? "Google sign-in failed. Please try again.");
    }
  }

  if (status === "sent")
    return (
      <Alert>
        <Mail />
        <AlertDescription>
          Check <strong>{email}</strong> for your sign-in link. It expires in 5 minutes.
        </AlertDescription>
      </Alert>
    );

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={status === "sending" || email.length === 0}>
          {status === "sending" ? <Loader2 className="animate-spin" /> : <Mail />}
          Email me a sign-in link
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>
          <Button variant="outline" onClick={handleGoogle} disabled={isGoogleLoading}>
            {isGoogleLoading ? <Loader2 className="animate-spin" /> : null}
            Continue with Google
          </Button>
        </>
      ) : null}

      {status === "error" && message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
