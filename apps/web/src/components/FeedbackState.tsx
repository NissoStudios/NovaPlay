import { AlertTriangle, Gamepad2, LoaderCircle } from "lucide-react";

interface FeedbackStateProps {
  type: "loading" | "error" | "empty";
  title?: string;
  message?: string;
}

export function FeedbackState({ type, title, message }: FeedbackStateProps) {
  const Icon = type === "loading" ? LoaderCircle : type === "error" ? AlertTriangle : Gamepad2;
  return (
    <div className={`feedback-state feedback-state--${type}`} role={type === "error" ? "alert" : "status"}>
      <Icon className={type === "loading" ? "spin" : ""} size={30} aria-hidden="true" />
      <h2>
        {title ??
          (type === "loading"
            ? "Chargement de la galaxie..."
            : type === "error"
              ? "Connexion interrompue"
              : "Aucun jeu trouvé")}
      </h2>
      {message && <p>{message}</p>}
    </div>
  );
}
