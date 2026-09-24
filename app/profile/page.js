"use client";

import { Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Briefcase,
  Code2,
  ExternalLink,
  GitBranch,
  Link as LinkIcon,
  LogOut,
  Users,
  UserPlus,
  Clock,
  UserCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import BottomNav from "@/components/BottomNav";
import LoginPrompt from "@/components/LoginPrompt";
import { useAuth } from "@/context/AuthContext";

import {
  getConnectionStatus,
  sendConnectionRequest,
} from "@/utils/connectionStorage";

import { getProjects } from "@/utils/projectStorage";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-2">
            <Users size={28} className="text-slate-300" />
            <p className="text-sm text-slate-400">
              Loading profile...
            </p>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    user,
    isLoggedIn,
    loading,
    logout,
  } = useAuth();

  const profileId = searchParams.get("id");

  const isOwnProfile =
    !profileId ||
    (user && String(profileId) === String(user.id));

  const [profile, setProfile] = useState(null);

  const [projects, setProjects] = useState([]);

  const [connectionStatus, setConnectionStatus] =
    useState(() => (isOwnProfile ? "self" : "none"));

  const [showLoginPrompt, setShowLoginPrompt] =
    useState(false);

  /*
   * LOAD PROFILE
   */
  useEffect(() => {
    if (!isLoggedIn || !user) {
      setProfile(null);
      setProjects([]);
      setConnectionStatus("none");
      return;
    }

    if (isOwnProfile) {
      setProfile(user);
      setConnectionStatus("self");

      const userProjects = getProjects(user.id);
      setProjects(userProjects);

      return;
    }

    try {
      const accounts =
        JSON.parse(
          localStorage.getItem("unilink_accounts")
        ) || [];

      const otherUser = accounts.find(
        (account) =>
          String(account.id) === String(profileId)
      );

      setProfile(otherUser || null);

      if (otherUser) {
        setConnectionStatus(
          getConnectionStatus(
            user.id,
            otherUser.id
          )
        );

        const otherUserProjects = getProjects(
          otherUser.id
        );

        setProjects(otherUserProjects);
      } else {
        setProjects([]);
      }
    } catch {
      setProfile(null);
      setProjects([]);
    }
  }, [
    user,
    isLoggedIn,
    profileId,
    isOwnProfile,
  ]);

  /*
   * RELOAD PROJECTS WHEN PAGE BECOMES VISIBLE
   *
   * Useful after returning from /profile/project/add.
   */
  useEffect(() => {
    if (!user || !isLoggedIn) return;

    const refreshProjects = () => {
      const targetId = isOwnProfile
        ? user.id
        : profileId;

      if (targetId != null) {
        setProjects(getProjects(targetId));
      }
    };

    window.addEventListener(
      "focus",
      refreshProjects
    );

    window.addEventListener(
      "unilink-projects-updated",
      refreshProjects
    );

    return () => {
      window.removeEventListener(
        "focus",
        refreshProjects
      );

      window.removeEventListener(
        "unilink-projects-updated",
        refreshProjects
      );
    };
  }, [
    user,
    isLoggedIn,
    isOwnProfile,
    profileId,
  ]);

  /*
   * LOGOUT
   */
  const handleLogout = () => {
    logout();
    router.push("/");
  };

  /*
   * CONNECT
   */
  const handleConnect = () => {
    if (!user || !profile) return;

    sendConnectionRequest(
      user.id,
      profile.id
    );

    setConnectionStatus("pending");
  };

  /*
   * LOADING
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Users
            size={28}
            className="text-slate-300"
          />

          <p className="text-sm text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /*
   * NOT LOGGED IN
   */
  if (!isLoggedIn) {
    return (
      <>
        <div className="min-h-screen bg-slate-50">
          <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
              <Users size={30} />
            </div>

            <h1 className="mt-5 text-xl font-semibold text-slate-900">
              Login required
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Log in to view profiles.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowLoginPrompt(true)
              }
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              Log In
            </button>
          </main>
        </div>

        <LoginPrompt
          isOpen={showLoginPrompt}
          onClose={() =>
            setShowLoginPrompt(false)
          }
        />
      </>
    );
  }

  /*
   * PROFILE NOT FOUND
   */
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Users
            size={32}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-3 text-base font-semibold text-slate-800">
            Profile not found
          </h2>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  /*
   * PROFILE DATA
   */
  const profilePhoto =
    profile.profilePhoto ||
    profile.avatar ||
    profile.profilePicture ||
    `https://i.pravatar.cc/200?u=${
      profile.id ||
      profile.username ||
      "user"
    }`;

  const name =
    profile.name || "Student";

  const username =
    profile.username ||
    profile.email?.split("@")[0] ||
    "unilink-user";

  const branch =
    profile.branch ||
    profile.department ||
    profile.course ||
    "Computer Science & Engineering";

  const year =
    profile.year ||
    profile.studyYear ||
    "1st Year";

  const bio =
    profile.bio ||
    "Building, learning and connecting with people at UniLink.";

  const skills = Array.isArray(profile.skills)
    ? profile.skills
    : [];

  /*
   * NOTE:
   * Projects now come from projectStorage,
   * not from profile.projects.
   */

  const connections = Array.isArray(
    profile.connections
  )
    ? profile.connections
    : [];

  const github =
    profile.github ||
    profile.githubUrl ||
    "";

  const linkedin =
    profile.linkedin ||
    profile.linkedinUrl ||
    "";

  const isAlumni =
    profile.accountType === "alumni";

  const displayYear = isAlumni
    ? profile.graduationYear
      ? `Class of ${profile.graduationYear}`
      : year
    : year;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">

      {/* HEADER */}

      <header
        className="
          sticky top-0 z-50
          flex h-[60px]
          items-center justify-between
          border-b border-slate-200
          bg-white/95
          px-4
          backdrop-blur-md

          lg:ml-[220px]
          min-[1400px]:ml-[240px]
        "
      >
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
        >
          <ArrowLeft size={21} />
        </button>

        <h1 className="text-base font-semibold text-slate-900">
          Profile
        </h1>

        {isOwnProfile ? (
          <button
            type="button"
            aria-label="Edit profile"
            onClick={() =>
              router.push("/profile/edit")
            }
            className="flex size-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100"
          >
            <Edit3 size={19} />
          </button>
        ) : (
          <div className="size-9" />
        )}
      </header>

      {/* MAIN */}

      <main
        className="
          w-full
          px-4
          py-6
          sm:px-6
          lg:ml-[220px]
          lg:w-[calc(100%-220px)]
          lg:px-8
          min-[1400px]:ml-[240px]
          min-[1400px]:w-[calc(100%-240px)]
        "
      >
        <div className="mx-auto w-full max-w-[900px]">

          {/* PROFILE CARD */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="flex flex-col items-center text-center">

              <img
                src={profilePhoto}
                alt={name}
                className="size-28 rounded-full border-4 border-white object-cover shadow-md"
              />

              <h2 className="mt-4 text-2xl font-bold text-slate-900">
                {name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                @{username}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">

                <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-500">
                  {branch}
                </span>

                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {displayYear}
                </span>

                {isAlumni && (
                  <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600">
                    🎓 Alumni
                  </span>
                )}

              </div>

              {isAlumni &&
                profile.currentRole && (
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    {profile.currentRole}

                    {profile.company &&
                      ` at ${profile.company}`}
                  </p>
                )}

              <p className="mt-4 max-w-[650px] text-sm leading-6 text-slate-600">
                {bio}
              </p>

              {/* CONNECTION */}

              {!isOwnProfile && (
                <div className="mt-5">

                  {connectionStatus === "none" && (
                    <button
                      type="button"
                      onClick={handleConnect}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    >
                      <UserPlus size={17} />
                      Connect
                    </button>
                  )}

                  {connectionStatus === "pending" && (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-default items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-500"
                    >
                      <Clock size={17} />
                      Request Sent
                    </button>
                  )}

                  {connectionStatus === "accepted" && (
                    <button
                      type="button"
                      disabled
                      className="inline-flex cursor-default items-center gap-2 rounded-xl bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-600"
                    >
                      <UserCheck size={17} />
                      Connected
                    </button>
                  )}

                </div>
              )}

              {/* STATS */}

              <div className="mt-6 grid w-full max-w-[460px] grid-cols-2 divide-x divide-slate-200 border-y border-slate-200 py-4">

                <div className="flex flex-col items-center">
                  <strong className="text-lg font-bold text-slate-900">
                    {connections.length}
                  </strong>

                  <span className="mt-1 text-xs text-slate-500">
                    Connections
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <strong className="text-lg font-bold text-slate-900">
                    {projects.length}
                  </strong>

                  <span className="mt-1 text-xs text-slate-500">
                    Projects
                  </span>
                </div>

              </div>

              {/* LINKS */}

              {(github || linkedin) && (
                <div className="mt-5 flex flex-wrap justify-center gap-3">

                  {github && (
                    <a
                      href={github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <GitBranch size={16} />
                      GitHub
                      <ExternalLink size={13} />
                    </a>
                  )}

                  {linkedin && (
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <LinkIcon size={16} />
                      LinkedIn
                      <ExternalLink size={13} />
                    </a>
                  )}

                </div>
              )}

            </div>
          </section>

          {/* ABOUT */}

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500">
                <Briefcase size={19} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  About
                </h3>

                <p className="text-xs text-slate-500">
                  Academic and professional information
                </p>
              </div>

            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Department
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {branch}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Year
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {displayYear}
                </p>
              </div>

              {profile.email && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm font-medium text-slate-800">
                    {profile.email}
                  </p>
                </div>
              )}

              {profile.college && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    College
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {profile.college}
                  </p>
                </div>
              )}

            </div>
          </section>

          {/* SKILLS */}

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                <Code2 size={19} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Skills
                </h3>

                <p className="text-xs text-slate-500">
                  Technologies and areas of expertise
                </p>
              </div>

            </div>

            {skills.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">

                {skills.map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {skill}
                  </span>
                ))}

              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">
                No skills added yet.
              </p>
            )}

          </section>

          {/* PROJECTS */}

          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-500">
                  <Code2 size={19} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Projects
                  </h3>

                  <p className="text-xs text-slate-500">
                    Projects they've worked on
                  </p>
                </div>

              </div>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/profile/project/add"
                    )
                  }
                  className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
                >
                  + Add Project
                </button>
              )}

            </div>

            {projects.length > 0 ? (

              <div className="mt-5 grid gap-3 md:grid-cols-2">

                {projects.map((project, index) => {

                  const projectName =
                    typeof project === "string"
                      ? project
                      : project.name ||
                        project.title ||
                        "Untitled Project";

                  const projectDescription =
                    typeof project === "string"
                      ? ""
                      : project.description || "";

                  const technologies =
                    typeof project === "object" &&
                    Array.isArray(
                      project.technologies
                    )
                      ? project.technologies
                      : [];

                  const githubLink =
                    typeof project === "object"
                      ? project.github || ""
                      : "";

                  const demoLink =
                    typeof project === "object"
                      ? project.demo ||
                        project.link ||
                        project.url ||
                        ""
                      : "";

                  return (
                    <div
                      key={
                        project.id ||
                        `${projectName}-${index}`
                      }
                      className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <h4 className="text-sm font-semibold text-slate-900">
                            {projectName}
                          </h4>

                          {projectDescription && (
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {projectDescription}
                            </p>
                          )}

                          {technologies.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">

                              {technologies.map(
                                (
                                  technology,
                                  technologyIndex
                                ) => (
                                  <span
                                    key={`${technology}-${technologyIndex}`}
                                    className="rounded-md bg-indigo-50 px-2 py-1 text-[9px] font-medium text-indigo-600"
                                  >
                                    {technology}
                                  </span>
                                )
                              )}

                            </div>
                          )}

                          {(githubLink || demoLink) && (
                            <div className="mt-4 flex flex-wrap gap-2">

                              {githubLink && (
                                <a
                                  href={githubLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-200"
                                >
                                  <GitBranch size={13} />
                                  GitHub
                                </a>
                              )}

                              {demoLink && (
                                <a
                                  href={demoLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
                                >
                                  <ExternalLink size={13} />
                                  Live Demo
                                </a>
                              )}

                            </div>
                          )}

                        </div>

                      </div>

                    </div>
                  );
                })}

              </div>

            ) : (

              <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-5 py-8 text-center">

                <Code2
                  size={28}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm text-slate-400">
                  No projects added yet.
                </p>

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/profile/project/add"
                      )
                    }
                    className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-600"
                  >
                    Add your first project
                  </button>
                )}

              </div>

            )}

          </section>

          {/* ALUMNI EXPERIENCE */}

          {isAlumni && (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                  <Briefcase size={19} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Experience
                  </h3>

                  <p className="text-xs text-slate-500">
                    Professional experience
                  </p>
                </div>

              </div>

              <div className="mt-5 rounded-xl border border-slate-200 p-4">

                {profile.currentRole ? (
                  <>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {profile.currentRole}
                    </h4>

                    {profile.company && (
                      <p className="mt-1 text-xs text-slate-500">
                        {profile.company}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    No experience added yet.
                  </p>
                )}

              </div>

            </section>
          )}

          {/* LOGOUT */}

          {isOwnProfile && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
            >
              <LogOut size={17} />
              Log Out
            </button>
          )}

        </div>
      </main>

      <BottomNav />
    </div>
  );
}