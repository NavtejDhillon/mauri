"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { revokeCover } from "./actions";
import { FormMessage } from "@/components/ui/form-message";

const button = "min-h-11 min-w-11 px-4 py-2 whitespace-nowrap text-sm font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${button} text-white bg-coral-600 hover:bg-coral-700`}>
      {pending ? "Revoking..." : "Confirm revoke"}
    </button>
  );
}

// Revoking is permanent (a revoked grant cannot be reinstated), so it takes two presses: Revoke,
// then Confirm revoke, with Cancel to back out. No browser dialog. Focus moves to the confirm
// button so keyboard and screen reader users land on the next step.
export function RevokeCoverButton({ grantId, who }: { grantId: string; who: string }) {
  const [state, action] = useActionState(revokeCover, null);
  const [confirming, setConfirming] = useState(false);
  const confirmArea = useRef<HTMLDivElement>(null);
  const revokeButton = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) confirmArea.current?.querySelector<HTMLButtonElement>("button[type=submit]")?.focus();
    else if (wasConfirming.current) revokeButton.current?.focus();
    wasConfirming.current = confirming;
  }, [confirming]);

  return (
    <div className="space-y-2 sm:shrink-0 sm:max-w-72 sm:text-right">
      {confirming ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={grantId} />
          <div ref={confirmArea} className="space-y-2">
            <p className="text-sm text-warm-700">Revoke cover for {who}? She loses access straight away. To restore it you would give cover again.</p>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <ConfirmButton />
              <button type="button" onClick={() => setConfirming(false)} className={`${button} text-warm-700 bg-white border border-warm-300`}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button ref={revokeButton} type="button" onClick={() => setConfirming(true)} className={`${button} text-coral-600 bg-coral-50 border border-coral-100`}>
          Revoke
        </button>
      )}
      <FormMessage error={state?.error} />
    </div>
  );
}
