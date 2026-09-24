const STORAGE_KEY = "uniLink_posts";
const ACCOUNTS_KEY = "unilink_accounts";

const getAccounts = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedAccounts =
      localStorage.getItem(ACCOUNTS_KEY);

    if (!savedAccounts) {
      return [];
    }

    const parsedAccounts = JSON.parse(savedAccounts);

    return Array.isArray(parsedAccounts)
      ? parsedAccounts
      : [];
  } catch (error) {
    console.error(
      "Failed to load accounts:",
      error
    );

    return [];
  }
};

const getCurrentUser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedUser =
      localStorage.getItem("unilink_user");

    if (!savedUser) {
      return null;
    }

    return JSON.parse(savedUser);
  } catch {
    return null;
  }
};

const getProfileAvatar = (user) => {
  if (!user) {
    return "";
  }

  return (
    user.profilePhoto ||
    user.avatar ||
    user.profilePicture ||
    ""
  );
};

const normalizePost = (post, currentUser) => {
  if (!post || typeof post !== "object") {
    return post;
  }

  if (!currentUser) {
    return post;
  }

  const postAuthorId =
    post.userId ??
    post.authorId ??
    post.createdBy ??
    post.ownerId;

  const belongsToCurrentUser =
    postAuthorId != null &&
    currentUser.id != null &&
    String(postAuthorId) ===
      String(currentUser.id);

  /*
   * Older posts created before userId was stored
   * may have been saved as "You".
   *
   * Only use this fallback when the post has no
   * author ID at all.
   */
  const legacyCurrentUserPost =
    postAuthorId == null &&
    (post.name === "You" ||
      post.name === currentUser.name);

  if (
    !belongsToCurrentUser &&
    !legacyCurrentUserPost
  ) {
    return post;
  }

  return {
    ...post,

    userId:
      post.userId ??
      currentUser.id,

    name:
      currentUser.name ||
      post.name ||
      "User",

    branch:
      currentUser.branch ||
      currentUser.department ||
      post.branch ||
      post.department ||
      "",

    year:
      currentUser.year ||
      post.year ||
      "",

    avatar:
      getProfileAvatar(currentUser) ||
      post.avatar ||
      "",
  };
};

export const getPosts = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedPosts =
      localStorage.getItem(STORAGE_KEY);

    if (!savedPosts) {
      return [];
    }

    const parsedPosts = JSON.parse(savedPosts);

    if (!Array.isArray(parsedPosts)) {
      return [];
    }

    const currentUser = getCurrentUser();

    const normalizedPosts = parsedPosts.map(
      (post) =>
        normalizePost(post, currentUser)
    );

    /*
     * Save the migrated posts back to localStorage
     * so the correction persists.
     */
    const changed =
      JSON.stringify(normalizedPosts) !==
      JSON.stringify(parsedPosts);

    if (changed) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalizedPosts)
      );
    }

    return normalizedPosts;
  } catch (error) {
    console.error(
      "Failed to load posts:",
      error
    );

    return [];
  }
};

export const savePost = (post) => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!post || typeof post !== "object") {
    return null;
  }

  const existingPosts = getPosts();

  const newPost = {
    ...post,

    id:
      post.id ??
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`,

    createdAt:
      post.createdAt ??
      Date.now(),

    likes:
      typeof post.likes === "number"
        ? post.likes
        : 0,

    comments:
      typeof post.comments === "number"
        ? post.comments
        : 0,
  };

  const updatedPosts = [
    newPost,
    ...existingPosts,
  ];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedPosts)
  );

  return newPost;
};