"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { getNotifications } from "@/utils/notificationStorage";

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showNavbar, setShowNavbar] = useState(true);

  /*
   * Load unread notification count
   */
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const loadNotifications = () => {
      const notifications = getNotifications(user.id);

      setUnreadCount(
        notifications.filter(
          (notification) => !notification.read
        ).length
      );
    };

    loadNotifications();

    window.addEventListener(
      "storage",
      loadNotifications
    );

    window.addEventListener(
      "unilink-notifications-updated",
      loadNotifications
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadNotifications
      );

      window.removeEventListener(
        "unilink-notifications-updated",
        loadNotifications
      );
    };
  }, [user]);

  /*
   * Show navbar when scrolling UP.
   * Hide navbar when scrolling DOWN.
   *
   * This works regardless of how far down the page
   * the user currently is.
   */
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show the navbar when we're at the top.
      if (currentScrollY <= 10) {
        setShowNavbar(true);
        lastScrollY = currentScrollY;
        return;
      }

      // Scrolling UP -> show navbar immediately.
      if (currentScrollY < lastScrollY) {
        setShowNavbar(true);
      }

      // Scrolling DOWN -> hide navbar immediately.
      if (currentScrollY > lastScrollY) {
        setShowNavbar(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50
        flex h-[60px]
        items-center justify-between
        border-b border-slate-200
        bg-white/95
        px-4
        backdrop-blur-md
        transition-transform duration-300 ease-out

        ${
          showNavbar
            ? "translate-y-0"
            : "-translate-y-full"
        }

        lg:ml-[220px]
        min-[1400px]:ml-[240px]
      `}
    >
      {/* Logo */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          Uni<span className="text-indigo-500">Link</span>
        </h1>

        <p className="hidden text-[10px] text-slate-500 sm:block">
          Ideas. People. Opportunities.
        </p>
      </div>

      {/* Notifications */}
      <button
        type="button"
        onClick={() =>
          router.push("/notifications")
        }
        aria-label="Notifications"
        className="
          relative
          flex h-10 w-10
          items-center justify-center
          rounded-full
          text-slate-600
          transition
          hover:bg-slate-100
          active:scale-95
        "
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span
            className="
              absolute
              right-1
              top-1
              flex
              h-[17px]
              min-w-[17px]
              items-center
              justify-center
              rounded-full
              bg-red-500
              px-1
              text-[9px]
              font-bold
              text-white
            "
          >
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>
    </header>
  );
}