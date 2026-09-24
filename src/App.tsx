import { useEffect } from "react";
import { useStore } from "./state/store";
import { href, useRoute, type Route } from "./ui/router";
import { Icon } from "./ui/icons";
import { Home } from "./views/Home";
import { LessonView } from "./views/LessonView";
import { Practice, Revise } from "./views/Revise";
import { SheetView } from "./views/SheetView";
import { Settings } from "./views/Settings";

const tabs = [
  { id: "home", label: "Leçons", icon: "book", href: href.home() },
  { id: "revise", label: "Réviser", icon: "target", href: href.revise() },
  { id: "settings", label: "Réglages", icon: "gear", href: href.settings() },
] as const;

function activeTab(route: Route): string {
  if (route.name === "lesson" || route.name === "home") return "home";
  if (route.name === "settings") return "settings";
  return "revise";
}

export function App() {
  const route = useRoute();
  const theme = useStore((s) => s.settings.theme);
  const weakCount = useStore((s) => s.weak.length);

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const current = activeTab(route);

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href={href.home()}>
          <span className="brand-mark">Fr</span>
          <span className="brand-name">En français</span>
        </a>
        <nav className="tabs" aria-label="Navigation">
          {tabs.map((t) => (
            <a key={t.id} href={t.href} className={`tab${current === t.id ? " is-active" : ""}`} aria-current={current === t.id ? "page" : undefined}>
              <Icon name={t.icon} size={20} />
              <span>{t.label}</span>
              {t.id === "revise" && weakCount > 0 && <span className="badge">{weakCount}</span>}
            </a>
          ))}
        </nav>
      </header>
      <main>{render(route)}</main>
    </div>
  );
}

function render(route: Route) {
  switch (route.name) {
    case "home":
      return <Home />;
    case "lesson":
      return <LessonView id={route.id} sectionId={route.section} />;
    case "revise":
      return <Revise />;
    case "practice":
      return <Practice mode={route.mode} />;
    case "sheet":
      return <SheetView id={route.id} />;
    case "settings":
      return <Settings />;
  }
}
