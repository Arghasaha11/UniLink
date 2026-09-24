const STORAGE_KEY = "unilink_projects";

const getRawProjects = () => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export const getProjects = (userId) => {
  if (typeof window === "undefined") {
    return [];
  }

  const savedProjects = getRawProjects();

  if (userId == null) {
    return savedProjects;
  }

  return savedProjects.filter(
    (project) =>
      project &&
      String(project.userId) === String(userId)
  );
};

export const saveProject = (project) => {
  if (typeof window === "undefined") {
    return;
  }

  const existingProjects = getRawProjects();

  const updatedProjects = [
    project,
    ...existingProjects,
  ];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedProjects)
  );
};

export const deleteProject = (projectId) => {
  if (typeof window === "undefined") {
    return;
  }

  const existingProjects = getRawProjects();

  const updatedProjects = existingProjects.filter(
    (project) => String(project.id) !== String(projectId)
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedProjects)
  );
};