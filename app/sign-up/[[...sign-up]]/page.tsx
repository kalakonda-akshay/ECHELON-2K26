"use client";

/**
 * WHY THIS ISN'T Clerk's prebuilt <SignUp /> COMPONENT
 * -----------------------------------------------------
 * The prompt asks for a name field and an organization/department field
 * stored in `unsafeMetadata`. Clerk's prebuilt <SignUp/> only exposes the
 * fields you turn on in the Clerk dashboard's built-in user model (first
 * name, last name, username, phone, etc.) — it has no slot for an arbitrary
 * custom field written into unsafeMetadata. To capture "organization /
 * department" the way the spec asks, this page uses Clerk's `useSignUp()`
 * hook to build a small custom form instead, styled to match /sign-in.
 *
 * Flow: collect fields -> signUp.create() with unsafeMetadata set ->
 * Clerk emails a verification code -> user enters it -> setActive() logs
 * them in. Role assignment happens server-side afterward via the Clerk
 * webhook in app/api/webhooks/clerk/route.ts, not from this client code
 * (unsafeMetadata is user-writable and must never be trusted for role).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<"form" | "verify">("form");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: {
          name,
          organization,
        },
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Verification incomplete. Double-check the code and try again.");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.longMessage ?? "Invalid or expired code.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">
          RadonGuard
        </span>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Radiation risk decision support for public safety
        </p>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-md">
        {step === "form" ? (
          <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-medium text-slate-900">Create your account</h1>
              <p className="text-sm text-slate-500">For health officers and regulators</p>
            </div>

            <Field label="Full name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Jane Rivera"
              />
            </Field>

            <Field label="Organization / department">
              <input
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="input"
                placeholder="Municipal Health Department"
              />
            </Field>

            <Field label="Work email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="jane.rivera@city.gov"
              />
            </Field>

            <Field label="Password">
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </Field>

            {/* Clerk Smart CAPTCHA mount point — required if bot protection is on */}
            <div id="clerk-captcha" />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Creating account…" : "Create account"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <a href="/sign-in" className="text-slate-700 underline hover:text-slate-900">
                Sign in
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-medium text-slate-900">Check your email</h1>
              <p className="text-sm text-slate-500">
                Enter the verification code we sent to {email}
              </p>
            </div>

            <Field label="Verification code">
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="input"
                placeholder="123456"
              />
            </Field>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Verifying…" : "Verify and continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-700">
      {label}
      {children}
    </label>
  );
}

/**
 * Tailwind utility classes referenced above (.input / .btn-primary) should be
 * defined once in globals.css, e.g.:
 *
 *   .input {
 *     @apply rounded-md border border-slate-300 px-3 py-2 text-sm
 *            focus:border-slate-500 focus:outline-none focus:ring-1
 *            focus:ring-slate-500;
 *   }
 *   .btn-primary {
 *     @apply rounded-md bg-slate-800 px-3 py-2 text-sm font-medium
 *            text-white hover:bg-slate-900 disabled:opacity-50;
 *   }
 */
