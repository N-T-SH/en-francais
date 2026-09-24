import { href } from "../ui/router";

export function NotFound() {
  return (
    <div className="page empty">
      <h1>Page introuvable</h1>
      <p><a href={href.home()}>Retour aux leçons</a></p>
    </div>
  );
}
