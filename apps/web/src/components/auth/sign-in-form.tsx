"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SignInFormProps {
  callbackURL: string;
  isMagicLinkEnabled: boolean;
  isGoogleEnabled: boolean;
}

type PendingAction = "sign-in" | "sign-up" | "magic-link" | "google";

type FormState =
  | { status: "idle" }
  | { status: "pending"; action: PendingAction }
  | { status: "error"; message: string }
  | { status: "link-sent" };

const IDLE_STATE: FormState = { status: "idle" };

function getSignUpErrorMessage(message: string | undefined): string {
  if (message && /already exists?/i.test(message))
    return "An account with this email already exists. Sign in instead.";
  return message ?? "Could not create your account. Please try again.";
}

export function SignInForm({ callbackURL, isMagicLinkEnabled, isGoogleEnabled }: SignInFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>(IDLE_STATE);

  const isPending = formState.status === "pending";
  const isPendingAction = (action: PendingAction) =>
    formState.status === "pending" && formState.action === action;

  function completeAuth() {
    router.push(callbackURL);
    router.refresh();
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "pending", action: "sign-in" });
    const { error } = await authClient.signIn.email({ email, password, callbackURL });
    if (error) {
      setFormState({
        status: "error",
        message: error.message ?? "Could not sign in. Check your email and password.",
      });
      return;
    }
    completeAuth();
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "pending", action: "sign-up" });
    const { error } = await authClient.signUp.email({ name, email, password, callbackURL });
    if (error) {
      setFormState({ status: "error", message: getSignUpErrorMessage(error.message) });
      return;
    }
    completeAuth();
  }

  async function handleMagicLink() {
    setFormState({ status: "pending", action: "magic-link" });
    const { error } = await authClient.signIn.magicLink({ email, callbackURL });
    if (error) {
      setFormState({
        status: "error",
        message: error.message ?? "Could not send the sign-in link. Please try again.",
      });
      return;
    }
    setFormState({ status: "link-sent" });
  }

  async function handleGoogle() {
    setFormState({ status: "pending", action: "google" });
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (error)
      setFormState({
        status: "error",
        message: error.message ?? "Google sign-in failed. Please try again.",
      });
  }

  if (formState.status === "link-sent")
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
      <Tabs defaultValue="sign-in" onValueChange={() => setFormState(IDLE_STATE)}>
        <TabsList className="w-full">
          <TabsTrigger value="sign-in">Sign in</TabsTrigger>
          <TabsTrigger value="sign-up">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="sign-in">
          <form onSubmit={handleSignIn} className="flex flex-col gap-3 pt-2">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Label htmlFor="sign-in-password">Password</Label>
            <Input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" disabled={isPending}>
              {isPendingAction("sign-in") ? <Loader2 className="animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="sign-up">
          <form onSubmit={handleSignUp} className="flex flex-col gap-3 pt-2">
            <Label htmlFor="sign-up-name">Name</Label>
            <Input
              id="sign-up-name"
              type="text"
              autoComplete="name"
              required
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Label htmlFor="sign-up-email">Email</Label>
            <Input
              id="sign-up-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Label htmlFor="sign-up-password">Password</Label>
            <Input
              id="sign-up-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">At least 8 characters.</p>
            <Button type="submit" disabled={isPending}>
              {isPendingAction("sign-up") ? <Loader2 className="animate-spin" /> : null}
              Create account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {formState.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{formState.message}</AlertDescription>
        </Alert>
      ) : null}

      {isMagicLinkEnabled ? (
        <Button
          type="button"
          variant="secondary"
          onClick={handleMagicLink}
          disabled={isPending || email.length === 0}
        >
          {isPendingAction("magic-link") ? <Loader2 className="animate-spin" /> : <Mail />}
          Email me a sign-in link instead
        </Button>
      ) : null}

      {isGoogleEnabled ? (
        <>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or
            <span className="bg-border h-px flex-1" />
          </div>
          <Button type="button" variant="outline" onClick={handleGoogle} disabled={isPending}>
            {isPendingAction("google") ? <Loader2 className="animate-spin" /> : null}
            Continue with Google
          </Button>
        </>
      ) : null}
    </div>
  );
}
