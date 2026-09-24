"use client";

import { useState } from "react";
import {
  Home as HomeIcon,
  Search,
  Plus,
  MessageCircle,
  User,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";

import CreateSheet from "./CreateSheet";
import LoginPrompt from "./LoginPrompt";
import { useAuth } from "@/context/AuthContext";

function BottomNav() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCreateClick = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setShowCreate(true);
  };

  const handleRestrictedNavigation = (path) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    router.push(path);
  };

  const navButton =
    "flex flex-col items-center justify-center gap-[3px] text-slate-500 text-[9px] lg:w-full lg:h-12 lg:flex-row lg:justify-start lg:gap-[14px] lg:rounded-[11px] lg:px-[14px] lg:text-[12px] lg:font-semibold lg:hover:bg-indigo-50 lg:hover:text-indigo-500";

  return (
    <>
      <nav
        className="
          fixed
          bottom-[10px]
          left-1/2
          z-50
          flex
          h-16
          w-[calc(100%-20px)]
          max-w-[600px]
          -translate-x-1/2
          items-center
          justify-around
          rounded-[20px]
          border
          border-slate-200
          bg-white/95
          shadow-[0_8px_25px_rgba(15,23,42,0.12)]

          lg:left-0
          lg:top-0
          lg:bottom-0
          lg:h-screen
          lg:w-[220px]
          lg:max-w-none
          lg:translate-x-0
          lg:flex-col
          lg:items-stretch
          lg:justify-start
          lg:gap-1.5
          lg:rounded-none
          lg:border-l-0
          lg:border-r
          lg:border-t-0
          lg:border-b-0
          lg:border-slate-200
          lg:bg-white
          lg:px-4
          lg:py-[30px]

          min-[1400px]:w-[240px]
          min-[1400px]:px-[22px]

          max-[380px]:bottom-[7px]
          max-[380px]:w-[calc(100%-14px)]
        "
      >
        {/* Desktop Brand */}
        <div className="hidden lg:block lg:px-[14px] lg:pt-2 lg:pb-[38px]">
          <h1 className="text-[25px] font-extrabold tracking-[-1px] lg:text-[28px]">
            Uni<span className="text-indigo-500">Link</span>
          </h1>

          <p className="mt-[3px] text-[11px] text-slate-500 lg:text-[10px]">
            Ideas. People. Opportunities.
          </p>
        </div>

        {/* Home */}
        <button
          type="button"
          className={navButton}
          onClick={() => router.push("/")}
        >
          <HomeIcon size={21} />
          <span>Home</span>
        </button>

        {/* Search */}
        <button
          type="button"
          className={navButton}
          onClick={() => router.push("/search")}
        >
          <Search size={21} />
          <span>Search</span>
        </button>

        {/* Create */}
        <button
          type="button"
          aria-label="Create"
          className="
            flex
            size-[52px]
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-gradient-to-br
            from-indigo-500
            to-violet-500
            text-white
            shadow-[0_5px_20px_rgba(99,102,241,0.4)]

            max-[380px]:size-12

            lg:my-1
            lg:h-12
            lg:w-full
            lg:flex-row
            lg:justify-start
            lg:gap-[14px]
            lg:rounded-[11px]
            lg:bg-transparent
            lg:px-[14px]
            lg:text-slate-500
            lg:shadow-none
            lg:hover:bg-indigo-50
            lg:hover:text-indigo-500
          "
          onClick={handleCreateClick}
        >
          <Plus size={27} />

          <span className="hidden text-[12px] font-semibold lg:inline">
            Create
          </span>
        </button>

        {/* Messages */}
        <button
          type="button"
          className={navButton}
          onClick={() =>
            handleRestrictedNavigation("/messages")
          }
        >
          <MessageCircle size={21} />
          <span>Messages</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          className={navButton}
          onClick={() =>
            handleRestrictedNavigation("/profile")
          }
        >
          <User size={21} />
          <span>Profile</span>
        </button>

        {/* Desktop User */}
        <div
          className="
            hidden
            lg:mt-auto
            lg:flex
            lg:items-center
            lg:gap-[10px]
            lg:border-t
            lg:border-slate-200
            lg:px-2
            lg:pt-4
            lg:pb-1
          "
        >
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt=""
              className="size-[38px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-indigo-500">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <div className="flex min-w-0 flex-col">
            <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
              {user?.name || "Guest"}
            </strong>

            <span className="mt-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-slate-500">
              {user?.username ||
                user?.department ||
                "UniLink"}
            </span>
          </div>
        </div>
      </nav>

      <CreateSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />
    </>
  );
}

export default BottomNav;