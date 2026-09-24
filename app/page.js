"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Bell,
  Plus,
  Home as HomeIcon,
  Users,
  MessageCircle,
  User,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";

export default function Home() {
  const router = useRouter();
  const { user, isLoggedIn, loading } = useAuth();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = JSON.parse(
        localStorage.getItem("unilink_posts") || "[]"
      );

      setPosts(Array.isArray(saved) ? saved : []);
    } catch {
      setPosts([]);
    }
  }, []);

  const requireLogin = (action) => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    action();
  };

  const profilePhoto =
    user?.profilePhoto ||
    user?.avatar ||
    user?.profilePicture ||
    `https://i.pravatar.cc/100?u=${user?.id || "user"}`;

  const userName = user?.name || "Student";

  const userBranch =
    user?.branch ||
    user?.department ||
    user?.course ||
    "CSE";

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside
        className="
          fixed
          left-0
          top-0
          z-50
          hidden
          h-screen
          w-[240px]
          flex-col
          border-r
          border-slate-200
          bg-white
          lg:flex
        "
      >
        {/* LOGO */}

        <div className="px-8 pt-12">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-900">
            Uni<span className="text-indigo-500">Link</span>
          </h1>

          <p className="mt-1 text-[12px] text-slate-500">
            Ideas. People. Opportunities.
          </p>
        </div>

        {/* NAVIGATION */}

        <nav className="mt-16 px-4">

          {/* HOME */}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="
              flex
              h-[52px]
              w-full
              items-center
              gap-4
              rounded-xl
              px-4
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            <HomeIcon size={22} />
            <span>Home</span>
          </button>

          {/* SEARCH */}

          <button
            type="button"
            onClick={() => router.push("/search")}
            className="
              mt-2
              flex
              h-[52px]
              w-full
              items-center
              gap-4
              rounded-xl
              px-4
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            <Search size={22} />
            <span>Search</span>
          </button>

          {/* CREATE */}

          <button
            type="button"
            onClick={() =>
              requireLogin(() => router.push("/create"))
            }
            className="
              mt-2
              flex
              h-[52px]
              w-full
              items-center
              gap-4
              rounded-xl
              bg-gradient-to-r
              from-indigo-500
              to-violet-500
              px-4
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:opacity-95
            "
          >
            <Plus size={22} />
            <span>Create</span>
          </button>

          {/* MESSAGES */}

          <button
            type="button"
            onClick={() =>
              requireLogin(() => router.push("/messages"))
            }
            className="
              mt-2
              flex
              h-[52px]
              w-full
              items-center
              gap-4
              rounded-xl
              px-4
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            <MessageCircle size={22} />
            <span>Messages</span>
          </button>

          {/* PROFILE */}

          <button
            type="button"
            onClick={() =>
              requireLogin(() => router.push("/profile"))
            }
            className="
              mt-2
              flex
              h-[52px]
              w-full
              items-center
              gap-4
              rounded-xl
              px-4
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            <User size={22} />
            <span>Profile</span>
          </button>

        </nav>

        {/* USER */}

        <div className="mt-auto border-t border-slate-200 px-5 py-5">

          <button
            type="button"
            onClick={() =>
              requireLogin(() => router.push("/profile"))
            }
            className="
              flex
              w-full
              items-center
              gap-3
              rounded-xl
              p-2
              text-left
              transition
              hover:bg-slate-50
            "
          >
            <img
              src={profilePhoto}
              alt={userName}
              className="size-11 rounded-full object-cover"
            />

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {userName}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {userBranch}
              </p>
            </div>
          </button>

        </div>
      </aside>

      {/* =====================================================
          EVERYTHING TO THE RIGHT OF SIDEBAR
      ====================================================== */}

      <div className="lg:ml-[240px]">

        {/* =================================================
            TOP NAVBAR
        ================================================== */}

        <header
          className="
            sticky
            top-0
            z-40
            h-[64px]
            border-b
            border-slate-200
            bg-white/95
            backdrop-blur-md
          "
        >
          <div
            className="
              mx-auto
              flex
              h-full
              w-full
              max-w-[1000px]
              items-center
              justify-between
              px-5
            "
          >

            {/* DESKTOP BRAND */}

            <div className="hidden lg:block">
              <h2 className="text-[20px] font-bold tracking-tight text-slate-900">
                Uni<span className="text-indigo-500">Link</span>
              </h2>

              <p className="text-[10px] text-slate-500">
                Ideas. People. Opportunities.
              </p>
            </div>

            {/* MOBILE BRAND */}

            <div className="lg:hidden">
              <h2 className="text-[20px] font-bold tracking-tight text-slate-900">
                Uni<span className="text-indigo-500">Link</span>
              </h2>
            </div>

            {/* NOTIFICATIONS */}

            <button
              type="button"
              onClick={() => router.push("/notifications")}
              className="
                flex
                size-9
                items-center
                justify-center
                rounded-full
                text-slate-600
                transition
                hover:bg-slate-100
              "
            >
              <Bell size={20} />
            </button>

          </div>
        </header>

        {/* =================================================
            MAIN CONTENT
        ================================================== */}

        <main
          className="
            mx-auto
            w-full
            max-w-[1000px]
            px-4
            pb-24
            pt-5
            sm:px-6
            lg:px-8
          "
        >

          {/* SEARCH */}

          <div className="relative">

            <Search
              size={20}
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              placeholder="Search posts, people, opportunities..."
              onClick={() => router.push("/search")}
              readOnly
              className="
                h-[48px]
                w-full
                cursor-pointer
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-12
                pr-4
                text-sm
                text-slate-700
                outline-none
                placeholder:text-slate-400
                transition
                hover:border-slate-300
              "
            />

          </div>

          {/* =================================================
              STORIES
          ================================================== */}

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-4">

            <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide">

              {/* YOUR STORY */}

              <button
                type="button"
                onClick={() =>
                  requireLogin(() => router.push("/create"))
                }
                className="flex min-w-[58px] flex-col items-center"
              >

                <div className="relative">

                  <img
                    src={profilePhoto}
                    alt="Your story"
                    className="
                      size-[58px]
                      rounded-full
                      border-2
                      border-slate-200
                      object-cover
                    "
                  />

                  <span
                    className="
                      absolute
                      bottom-0
                      right-0
                      flex
                      size-5
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      border-white
                      bg-indigo-500
                      text-white
                    "
                  >
                    <Plus size={12} />
                  </span>

                </div>

                <span
                  className="
                    mt-2
                    max-w-[65px]
                    truncate
                    text-[11px]
                    font-medium
                    text-slate-700
                  "
                >
                  Your story
                </span>

              </button>

              {/* SAMPLE STORIES */}

              {[
                {
                  name: "Rohan",
                  image: "https://i.pravatar.cc/100?img=11",
                },
                {
                  name: "Ananya",
                  image: "https://i.pravatar.cc/100?img=32",
                },
                {
                  name: "Aditya",
                  image: "https://i.pravatar.cc/100?img=12",
                },
                {
                  name: "Priya",
                  image: "https://i.pravatar.cc/100?img=47",
                },
                {
                  name: "Rahul",
                  image: "https://i.pravatar.cc/100?img=13",
                },
                {
                  name: "Sneha",
                  image: "https://i.pravatar.cc/100?img=44",
                },
              ].map((story) => (
                <button
                  type="button"
                  key={story.name}
                  className="
                    flex
                    min-w-[58px]
                    flex-col
                    items-center
                  "
                >

                  <div
                    className="
                      rounded-full
                      bg-gradient-to-tr
                      from-indigo-500
                      via-violet-500
                      to-pink-500
                      p-[2px]
                    "
                  >

                    <div className="rounded-full bg-white p-[2px]">

                      <img
                        src={story.image}
                        alt={story.name}
                        className="
                          size-[54px]
                          rounded-full
                          object-cover
                        "
                      />

                    </div>

                  </div>

                  <span
                    className="
                      mt-2
                      max-w-[65px]
                      truncate
                      text-[11px]
                      font-medium
                      text-slate-700
                    "
                  >
                    {story.name}
                  </span>

                </button>
              ))}

            </div>

          </section>

          {/* =================================================
              FEED
          ================================================== */}

          <section className="mt-5 space-y-5">

            {posts.length > 0 ? (
              posts.map((post, index) => {

                const postUser =
                  post.user ||
                  post.author ||
                  {};

                const postName =
                  postUser.name ||
                  post.name ||
                  "Student";

                const postAvatar =
                  postUser.profilePhoto ||
                  postUser.avatar ||
                  post.avatar ||
                  `https://i.pravatar.cc/100?img=${
                    index + 20
                  }`;

                const postBranch =
                  postUser.branch ||
                  post.branch ||
                  "CSE";

                return (
                  <article
                    key={
                      post.id ||
                      `${postName}-${index}`
                    }
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-slate-200
                      bg-white
                    "
                  >

                    {/* POST HEADER */}

                    <div className="flex items-center justify-between px-5 pt-5">

                      <div className="flex items-center gap-3">

                        <img
                          src={postAvatar}
                          alt={postName}
                          className="
                            size-10
                            rounded-full
                            object-cover
                          "
                        />

                        <div>

                          <h3 className="text-sm font-semibold text-slate-900">
                            {postName}
                          </h3>

                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {postBranch}

                            {post.year
                              ? ` • ${post.year}`
                              : ""}

                            {post.createdAt
                              ? ` • ${post.createdAt}`
                              : ""}
                          </p>

                        </div>

                      </div>

                      <button
                        type="button"
                        className="
                          flex
                          size-8
                          items-center
                          justify-center
                          rounded-full
                          text-slate-400
                          hover:bg-slate-100
                        "
                      >
                        <MoreHorizontal size={19} />
                      </button>

                    </div>

                    {/* TEXT */}

                    {(post.text || post.content) && (
                      <p
                        className="
                          px-5
                          pt-4
                          text-sm
                          leading-6
                          text-slate-700
                        "
                      >
                        {post.text || post.content}
                      </p>
                    )}

                    {/* IMAGE */}

                    {post.image && (
                      <div
                        className="
                          mt-4
                          overflow-hidden
                          bg-slate-100
                        "
                      >
                        <img
                          src={post.image}
                          alt="Post"
                          className="
                            block
                            max-h-[650px]
                            w-full
                            object-contain
                          "
                        />
                      </div>
                    )}

                    {/* ACTIONS */}

                    <div
                      className="
                        flex
                        items-center
                        gap-6
                        border-t
                        border-slate-100
                        px-5
                        py-4
                      "
                    >

                      <button
                        type="button"
                        onClick={() =>
                          requireLogin(() => {})
                        }
                        className="
                          text-xs
                          font-medium
                          text-slate-500
                          hover:text-indigo-500
                        "
                      >
                        Like
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          requireLogin(() => {})
                        }
                        className="
                          text-xs
                          font-medium
                          text-slate-500
                          hover:text-indigo-500
                        "
                      >
                        Comment
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          requireLogin(() => {})
                        }
                        className="
                          text-xs
                          font-medium
                          text-slate-500
                          hover:text-indigo-500
                        "
                      >
                        Share
                      </button>

                    </div>

                  </article>
                );
              })
            ) : (

              /* EMPTY FEED */

              <div
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  px-6
                  py-16
                  text-center
                "
              >

                <div
                  className="
                    mx-auto
                    flex
                    size-14
                    items-center
                    justify-center
                    rounded-full
                    bg-indigo-50
                    text-indigo-500
                  "
                >
                  <Users size={26} />
                </div>

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  Your feed is empty
                </h3>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-sm
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  Connect with people and share something
                  with your college network.
                </p>

                <button
                  type="button"
                  onClick={() => router.push("/search")}
                  className="
                    mt-5
                    rounded-xl
                    bg-indigo-500
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-white
                    transition
                    hover:bg-indigo-600
                  "
                >
                  Find People
                </button>

              </div>

            )}

          </section>

        </main>

      </div>

      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <div className="lg:hidden">
        <BottomNav />
      </div>

      {/* LOGIN PROMPT */}

      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
      />

    </div>
  );
}