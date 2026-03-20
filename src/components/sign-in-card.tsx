"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function SignInCard({ registrationEnabled }: { registrationEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Sending sign-in link...");
    const response = await signIn("nodemailer", {
      email,
      redirect: false,
      callbackUrl: "/"
    });

    setStatus(
      !response?.error
        ? "Check your email for the login link."
        : "Sign-in failed. Registration may be disabled or the mail server may be misconfigured."
    );
  }

  return (
    <div className="card auth-card">
      <h2>Email sign-in</h2>
      <p>
        FuelAware uses passwordless magic links. {registrationEnabled ? "New users can register." : "Registration is currently closed."}
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Email
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit">Send magic link</button>
      </form>
      {status ? <p className="muted">{status}</p> : null}
    </div>
  );
}
