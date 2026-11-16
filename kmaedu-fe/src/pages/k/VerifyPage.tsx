import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/k-page/page-header";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/antd/input-otp";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoSentEmail, setAutoSentEmail] = useState(false);
  const hasSentEmailRef = useRef(false);
  const navigate = useNavigate();
  const { verifyAccount, sendVerificationEmail, loading, user } = useAuthStore();

  useEffect(() => {
    if (user && !user.isVerified && !hasSentEmailRef.current) {
      hasSentEmailRef.current = true;
      sendVerificationEmail()
        .then(() => setAutoSentEmail(true))
        .catch((error) => {
          console.error("Failed to auto-send verification email:", error);
        });
    }
  }, [user, sendVerificationEmail]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      await verifyAccount(code);
      setSuccess(true);
      setTimeout(() => {
        navigate("/k", { replace: true });
      }, 2000);
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const handleResendCode = async () => {
    try {
      await sendVerificationEmail();
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    }
  };

  if (user?.isVerified) {
    return (
      <div>
        <PageHeader icon={<ShieldCheck />} title="Xác minh tài khoản" subtitle="Bảo vệ tài khoản và mở đầy đủ tính năng học tập" />
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)] p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="mb-3 text-xl font-bold text-ink">Tài khoản đã được xác minh!</h2>
            <p className="mb-6 text-muted-foreground">
              Tài khoản của bạn đã được xác minh thành công. Bạn có thể sử dụng đầy đủ các tính năng của hệ thống.
            </p>
            <Link to="/k" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={<ShieldCheck />} title="Xác minh tài khoản" subtitle="Bảo vệ tài khoản và mở đầy đủ tính năng học tập" />
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)] p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-brand-soft">
              <ShieldCheck className="size-6 text-brand" />
            </div>
            <h2 className="text-xl font-bold text-ink">Nhập mã xác minh</h2>
            <p className="mt-2 text-body">Mã xác minh đã được gửi đến email của bạn</p>
            {user?.email && <p className="mt-1 text-sm text-muted-foreground">({user.email})</p>}
          </div>

          {autoSentEmail && !success && (
            <div className="mb-6 rounded-xl border border-brand-border bg-brand-soft p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-brand" />
                <p className="text-sm text-brand">Email xác minh đã được gửi tự động. Vui lòng kiểm tra hộp thư của bạn.</p>
              </div>
            </div>
          )}

          {success ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-green-600">Xác minh thành công!</p>
              <p className="mt-2 text-sm text-muted-foreground">Đang chuyển hướng...</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="code" className="mb-2 block text-sm font-medium text-ink">Mã xác minh</label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={code} onChange={(value) => setCode(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang xác minh...
                    </>
                  ) : (
                    "Xác minh"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="mb-2 text-sm text-muted-foreground">Không nhận được mã?</p>
                <button onClick={handleResendCode} disabled={loading} className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-brand hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50">
                  <Mail className="h-4 w-4" />
                  Gửi lại mã xác minh
                </button>
              </div>
            </>
          )}

          <div className="mt-6 border-t border-hairline pt-6 text-center">
            <Link to="/k" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
