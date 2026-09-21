import { useEffect, useState } from "react";
import { SignUpForm, type SignUpErrors, type SignUpValues } from "@/components/motion/signup-form";
import { api, ApiError } from "@/shared/api/client";
import { portalBrand } from "@/portal/portal";
import { IconNavGrid } from "@/shared/icons";
import { Button } from "@/shared/ui";

const STRENGTH_LABELS = ["过短", "较弱", "一般", "较好", "很强"] as const;

function validateAuth(mode: "signin" | "signup") {
  return (values: SignUpValues): SignUpErrors => {
    const errors: SignUpErrors = {};
    const username = values.email.trim();
    if (!username) errors.email = "请输入账号";
    else if (username.length > 64) errors.email = "账号最多 64 个字符";
    else if (mode === "signup" && username.length < 3) errors.email = "账号至少 3 个字符";

    if (!values.password) errors.password = "请输入密码";
    else if (mode === "signup" && values.password.length < 10) {
      errors.password = "密码至少 10 位，建议组合字母、数字与符号";
    }

    if (mode === "signup") {
      if (!values.confirmPassword) errors.confirmPassword = "请再次输入密码";
      else if (values.confirmPassword !== values.password) errors.confirmPassword = "两次输入的密码不一致";
    }

    return errors;
  };
}

export function SessionDialog({
  notice,
  onSignedIn,
  portal = false,
}: {
  notice?: string;
  onSignedIn: () => void;
  portal?: boolean;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [error, setError] = useState(notice || "");

  useEffect(() => {
    const controller = new AbortController();
    api<{ registrationEnabled: boolean }>("/api/v1/auth/config", "GET", undefined, controller.signal)
      .then((config) => setRegistrationEnabled(config.registrationEnabled === true))
      .catch(() => setRegistrationEnabled(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setError(notice || "");
  }, [notice]);

  const signingUp = mode === "signup";

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-ui-ground p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-control bg-primary/10 text-body font-semibold text-primary">
          {portal ? <IconNavGrid size={24} /> : "DW"}
        </span>
        <div>
          <p className="text-body font-medium text-ui-ink">{portal ? portalBrand.name : "DocWeave"}</p>
          <p className="text-caption text-ui-muted">{portal ? "企业管理系统" : "企业知识库"}</p>
        </div>
      </div>
      <SignUpForm
        key={mode}
        mode={mode}
        identity="username"
        showName={false}
        showConfirm={signingUp}
        showTerms={false}
        strengthMeter={signingUp}
        minPasswordLength={signingUp ? 10 : 1}
        title={signingUp ? "创建账号" : portal ? "登录工作台" : "登录知识库"}
        description={
          signingUp
            ? "注册后由管理员分配组织与权限。"
            : portal ? "使用企业账号，进入你的工作台。" : "使用门户账号登录知识库。"
        }
        submitLabel={signingUp ? "注册并进入" : "登录"}
        identityLabel="账号"
        identityPlaceholder="请输入账号"
        passwordLabel="密码"
        passwordPlaceholder={signingUp ? "至少 10 位" : "请输入密码"}
        confirmLabel="确认密码"
        confirmPlaceholder="再输入一次密码"
        strengthPrefix="密码强度："
        strengthLabels={STRENGTH_LABELS}
        loadingText={signingUp ? "正在注册…" : "正在验证…"}
        successText={signingUp ? "已创建" : "已登录"}
        revealPasswordLabel="显示密码"
        hidePasswordLabel="隐藏密码"
        errorMessage={error}
        validate={validateAuth(mode)}
        onSubmit={async (values) => {
          setError("");
          const body = { username: values.email.trim(), password: values.password };
          try {
            if (signingUp) await api("/api/v1/auth/register", "POST", body);
            await api("/api/v1/auth/login", "POST", body);
            onSignedIn();
          } catch (caught) {
            const message = caught instanceof ApiError ? caught.message : signingUp ? "注册失败" : "登录失败";
            setError(message);
            throw caught instanceof Error ? caught : new Error(message);
          }
        }}
        footer={
          <>
            {signingUp ? "已有账号？" : "还没有账号？"}{" "}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(signingUp ? "signin" : "signup");
                setError("");
              }}
            >
              {signingUp ? "返回登录" : "注册账号"}
            </Button>
            {registrationEnabled ? null : <p className="mt-2">如需开通账号，请联系管理员。</p>}
          </>
        }
      />
    </div>
  );
}
