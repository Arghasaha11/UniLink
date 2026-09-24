const STORAGE_KEY = "unilink_opportunities";

export const getOpportunities = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const savedOpportunities =
    localStorage.getItem(STORAGE_KEY);

  if (!savedOpportunities) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedOpportunities);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveOpportunity = (opportunity) => {
  if (typeof window === "undefined") {
    return false;
  }

  const existingOpportunities = getOpportunities();

  const updatedOpportunities = [
    opportunity,
    ...existingOpportunities,
  ];

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedOpportunities)
    );

    return true;
  } catch (error) {
    if (error?.name === "QuotaExceededError") {
      console.error(
        "UniLink: Storage quota exceeded."
      );

      return false;
    }

    console.error(
      "UniLink: Failed to save opportunity.",
      error
    );

    return false;
  }
};