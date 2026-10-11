import { useLocation } from "wouter";
import { Clock, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCardFooter, AuthLayout } from "@/components/auth/auth-layout";
import { ORG } from "@/seo/site";

export default function PendingApprovalPage() {
  const [, navigate] = useLocation();

  return (
    <AuthLayout>
      <div className="px-5 py-6 sm:px-7">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <h2 className="mt-3 text-xl font-bold text-foreground sm:text-2xl">Awaiting approval</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been created and is waiting for admin approval. Please contact the management to get
            it approved. You&apos;ll get an email once you can sign in.
          </p>
        </div>

        <div className="mt-5 space-y-2 rounded-button bg-muted/50 p-4 text-sm">
          <a href={`mailto:${ORG.email}`} className="flex items-center gap-2 text-foreground hover:text-primary">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
            {ORG.email}
          </a>
          <a href={`tel:${ORG.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-foreground hover:text-primary">
            <Phone className="h-4 w-4 text-primary" aria-hidden />
            {ORG.phone}
          </a>
        </div>

        <Button className="mt-5 w-full" onClick={() => navigate("/login")} data-testid="button-back-to-login">
          Back to login
        </Button>

        <AuthCardFooter />
      </div>
    </AuthLayout>
  );
}
