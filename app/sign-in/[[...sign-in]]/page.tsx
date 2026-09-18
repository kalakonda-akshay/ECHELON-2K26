import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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

      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "shadow-md border border-slate-200 rounded-xl",
            headerTitle: "text-slate-900",
            headerSubtitle: "text-slate-500",
            formButtonPrimary:
              "bg-slate-800 hover:bg-slate-900 text-sm normal-case",
            footerActionLink: "text-slate-700 hover:text-slate-900",
            formFieldInput: "border-slate-300 focus:border-slate-500",
          },
          variables: {
            colorPrimary: "#1e293b",
          },
        }}
      />
    </div>
  );
}
