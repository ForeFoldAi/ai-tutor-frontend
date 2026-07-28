import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { API_BASE } from "@/api";
import { MSG, studentFriendlyApiError, studentFriendlyError } from "@/lib/student-messages";
import { AuthCardFooter, AuthCardIllustration, AuthLayout } from "@/components/auth/auth-layout";

type AccountOption = {
  id: number;
  full_name: string;
  username: string;
};

type Step = "identify" | "otp" | "password";

const identifySchema = z.object({
  email: z.string().email("Enter a valid email address"),
  userId: z.string().optional(),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type IdentifyFormValues = z.infer<typeof identifySchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("identify");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsReady, setAccountsReady] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const identifyForm = useForm<IdentifyFormValues>({
    resolver: zodResolver(identifySchema),
    defaultValues: { email: "", userId: "" },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedUserId) ?? null,
    [accounts, selectedUserId]
  );

  const clearAccounts = () => {
    setAccounts([]);
    setAccountsReady(false);
    setSelectedUserId(null);
    identifyForm.setValue("userId", "");
  };

  const onIdentifyContinue = async (data: IdentifyFormValues) => {
    const nextEmail = data.email.trim().toLowerCase();

    // First continue: look up accounts and show dropdown under email
    if (!accountsReady || nextEmail !== email) {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: nextEmail }),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(studentFriendlyApiError(text, res.status, MSG.tryAgain));
        }
        const payload = JSON.parse(text) as { accounts?: AccountOption[] };
        const list = Array.isArray(payload.accounts) ? payload.accounts : [];
        if (list.length === 0) {
          clearAccounts();
          toast({
            title: "No account found",
            description: "We couldn't find an account for that email.",
            variant: "destructive",
          });
          return;
        }
        setEmail(nextEmail);
        setAccounts(list);
        setAccountsReady(true);
        const only = list.length === 1 ? String(list[0].id) : "";
        identifyForm.setValue("userId", only);
        setSelectedUserId(list.length === 1 ? list[0].id : null);
        setResetToken(null);
        otpForm.reset({ otp: "" });
        passwordForm.reset({ newPassword: "", confirmPassword: "" });
      } catch (error: unknown) {
        toast({
          title: "Couldn't look up that email",
          description: studentFriendlyError(error, MSG.tryAgain),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Second continue: account selected → send OTP
    const userIdRaw = data.userId || (selectedUserId != null ? String(selectedUserId) : "");
    if (!userIdRaw) {
      identifyForm.setError("userId", { message: "Select an account" });
      return;
    }
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId)) {
      identifyForm.setError("userId", { message: "Select an account" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_id: userId }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(studentFriendlyApiError(text, res.status, MSG.tryAgain));
      }
      setSelectedUserId(userId);
      setResetToken(null);
      otpForm.reset({ otp: "" });
      setStep("otp");
      toast({
        title: "Check your email",
        description: "A reset code has been sent. Enter it below to continue.",
      });
    } catch (error: unknown) {
      toast({
        title: "Couldn't send code",
        description: studentFriendlyError(
          error,
          "We couldn't send the reset email. Please try again in a moment."
        ),
        variant: "destructive",
      });
      // stay on identify — do not open Verify code
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyOtp = async (data: OtpFormValues) => {
    if (selectedUserId == null) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          user_id: selectedUserId,
          otp: data.otp,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(studentFriendlyApiError(text, res.status, "That code didn't work. Try again."));
      }
      const payload = JSON.parse(text) as { reset_token?: string };
      if (!payload.reset_token) {
        throw new Error("That code didn't work. Try again.");
      }
      setResetToken(payload.reset_token);
      passwordForm.reset({ newPassword: "", confirmPassword: "" });
      setStep("password");
      toast({
        title: "Code verified",
        description: "Choose a new password for your account.",
      });
    } catch (error: unknown) {
      toast({
        title: "Couldn't verify code",
        description: studentFriendlyError(error, MSG.tryAgain),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSetPassword = async (data: PasswordFormValues) => {
    if (!resetToken) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: data.newPassword,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(studentFriendlyApiError(text, res.status, MSG.tryAgain));
      }
      toast({
        title: "Password updated",
        description: "You can sign in with your new password.",
      });
      navigate("/login");
    } catch (error: unknown) {
      toast({
        title: "Couldn't reset password",
        description: studentFriendlyError(error, MSG.tryAgain),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitle =
    step === "identify"
      ? "Forgot password"
      : step === "otp"
        ? "Verify code"
        : "New password";

  const stepSubtitle =
    step === "identify"
      ? "Enter the email linked to your account"
      : step === "otp"
        ? selectedAccount
          ? `Enter the code sent for ${selectedAccount.full_name} (${selectedAccount.username})`
          : "Enter the 6-digit code from your email"
        : "Enter and confirm your new password";

  return (
    <AuthLayout scrollable>
      <AuthCardIllustration />

      <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-6">
        <div className="mb-4 text-center">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">{stepTitle}</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stepSubtitle}</p>
        </div>

        {step === "identify" && (
          <Form {...identifyForm}>
            <form onSubmit={identifyForm.handleSubmit(onIdentifyContinue)} className="space-y-3">
              <FormField
                control={identifyForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="h-10 pl-10"
                          data-testid="input-forgot-email"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (accountsReady) clearAccounts();
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {accountsReady && accounts.length > 0 && (
                <FormField
                  control={identifyForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Account</FormLabel>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          setSelectedUserId(Number(v));
                        }}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-forgot-account">
                            <SelectValue placeholder="Select name / username" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.full_name} — {a.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full gap-2 text-base" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {accountsReady ? "Sending…" : "Checking…"}
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}

        {step === "otp" && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-3">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Verification code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                        data-testid="input-forgot-otp"
                      >
                        <InputOTPGroup className="w-full justify-between gap-2 sm:gap-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="h-11 w-10 shrink-0 border-2 border-border sm:h-12 sm:w-11"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => setStep("identify")}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" className="flex-1 gap-2 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify code
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "password" && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSetPassword)} className="space-y-3">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">New password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          className="h-10 pl-10 pr-10"
                          data-testid="input-forgot-new-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          type={showConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
                          className="h-10 pl-10 pr-10"
                          data-testid="input-forgot-confirm-password"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirm((v) => !v)}
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full gap-2 text-base" disabled={isLoading || !resetToken}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </Form>
        )}

        <p className="mt-3 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            Sign in
          </button>
        </p>

        <AuthCardFooter />
      </div>
    </AuthLayout>
  );
}
