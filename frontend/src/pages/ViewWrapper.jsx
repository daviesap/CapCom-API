import React from "react";
import { useSearchParams } from "react-router-dom";
import ViewProfile from "./ViewProfile"; // already in `pages/`

export default function ViewWrapper() {
  const [params] = useSearchParams();
  const profileId = params.get("profileId");
  return <ViewProfile profileId={profileId} />;
}