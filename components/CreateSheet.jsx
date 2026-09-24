"use client";

import { X, Camera, FileText, CalendarPlus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateSheet({ isOpen, onClose }) {
  const router = useRouter();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end bg-slate-900/35"
      onClick={onClose}
    >
      <div
        className="mx-auto w-full max-w-[600px] animate-slide-up rounded-t-[24px] bg-white px-[18px] pt-[10px] pb-[30px] shadow-[0_-10px_40px_rgba(15,23,42,0.15)] md:rounded-[24px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-[2px] mb-[20px] h-1 w-[38px] rounded-[10px] bg-slate-200"></div>

        <div className="mb-[20px] flex items-start justify-between">
          <div>
            <h2 className="text-[20px]">Create</h2>
            <p className="mt-1 text-slate-500 text-[11px]">What do you want to share?</p>
          </div>

          <button
            className="flex size-[34px] items-center justify-center rounded-full bg-slate-100 text-slate-500"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            className="flex w-full items-center gap-[13px] rounded-[14px] p-[13px] text-left active:scale-[0.98]"
            onClick={() => {
              onClose();
              router.push("/create/story");
            }}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-violet-500">
              <Camera size={21} />
            </div>

            <div>
              <h3 className="text-[13px]">Story</h3>
              <p className="mt-[3px] text-slate-500 text-[10px]">Share something for 24 hours</p>
            </div>
          </button>

          <button
            className="flex w-full items-center gap-[13px] rounded-[14px] p-[13px] text-left active:scale-[0.98]"
            onClick={() => {
              onClose();
              router.push("/create/post");
            }}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
              <FileText size={21} />
            </div>

            <div>
              <h3 className="text-[13px]">Post</h3>
              <p className="mt-[3px] text-slate-500 text-[10px]">Share something with your network</p>
            </div>
          </button>

          <button
            className="flex w-full items-center gap-[13px] rounded-[14px] p-[13px] text-left active:scale-[0.98]"
            onClick={() => {
              onClose();
              router.push("/create/opportunity");
            }}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
              <CalendarPlus size={21} />
            </div>

            <div>
              <h3 className="text-[13px]">Opportunity</h3>
              <p className="mt-[3px] text-slate-500 text-[10px]">Share an event, hackathon or opportunity</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}