import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found container">
      <span>404</span>
      <h1>Cette planète n’existe pas</h1>
      <p>La page demandée s’est peut-être perdue dans une autre galaxie.</p>
      <Link className="button button--primary" to="/">
        <ArrowLeft size={18} /> Retour à l’accueil
      </Link>
    </div>
  );
}
