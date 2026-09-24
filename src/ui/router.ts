import { useEffect, useState } from "react";

// Hash routes work on any static host (GitHub Pages included) without
// server-side rewrites.
export type Route =
  | { name: "home" }
  | { name: "lesson"; id: string; section?: string }
  | { name: "revise" }
  | { name: "practice"; mode: "quiz" | "listen" }
  | { name: "sheet"; id: string }
  | { name: "settings" };

export function parse(hash: string): Route {
  const [, a, b, c] = hash.replace(/^#/, "").split("/");
  switch (a) {
    case "lecon":
      return b ? { name: "lesson", id: decodeURIComponent(b), section: c && decodeURIComponent(c) } : { name: "home" };
    case "reviser":
      if (b === "quiz" || b === "ecoute") return { name: "practice", mode: b === "quiz" ? "quiz" : "listen" };
      if (b === "fiche" && c) return { name: "sheet", id: decodeURIComponent(c) };
      return { name: "revise" };
    case "reglages":
      return { name: "settings" };
    default:
      return { name: "home" };
  }
}

export const href = {
  home: () => "#/",
  lesson: (id: string, section?: string) => `#/lecon/${id}${section ? `/${section}` : ""}`,
  revise: () => "#/reviser",
  quiz: () => "#/reviser/quiz",
  listen: () => "#/reviser/ecoute",
  sheet: (id: string) => `#/reviser/fiche/${id}`,
  settings: () => "#/reglages",
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
