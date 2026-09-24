"use client";

import { X, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

function LoginPrompt({ isOpen, onClose }) {
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  const goToLogin = () => {
    onClose();
    router.push("/login");
  };

  const goToRegister = () => {
    onClose();
    router.push("/register");
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 p-5" onClick={onClose}>
      <div
        className="relative animate-login-prompt w-full max-w-[340px] rounded-[22px] border border-slate-200 bg-white px-[22px] pt-7 pb-5 text-center shadow-[0_15px_50px_rgba(15,23,42,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          onClick={onClose}
        >
          <X size={19} />
        </button>

        <div className="mx-auto mb-[15px] flex size-[54px] items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
          <LockKeyhole size={25} />
        </div>

        <h2 className="text-[19px]">Login required</h2>

        <p className="mx-auto my-2 mb-[20px] max-w-[260px] text-slate-500 text-[11px] leading-[1.5]">
          You're not logged in. Log in or create an account
          to continue.
        </p>

        <button
          className="w-full rounded-[11px] bg-indigo-500 p-3 text-[12px] font-semibold text-white"
          onClick={goToLogin}
        >
          Log In
        </button>

        <button
          className="mt-2 w-full rounded-[11px] border border-slate-200 bg-white p-3 text-[12px] font-semibold text-indigo-500"
          onClick={goToRegister}
        >
          Sign Up
        </button>

        <button
          className="mt-[14px] text-slate-500 text-[10px]"
          onClick={onClose}
        >
          Continue browsing
        </button>
      </div>
    </div>
  );
}

export default LoginPrompt;