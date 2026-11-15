import {
  GAME_CATEGORIES,
  GAME_DIFFICULTIES,
  INTERNAL_GAME_IDS,
  type Game,
  type GameInput,
} from "@novaplay/shared";
import { Save, X } from "lucide-react";
import { useEffect, useState } from "react";

const internalGameLabels: Record<(typeof INTERNAL_GAME_IDS)[number], string> = {
  "neon-snake": "Neon Serpent",
  "merge-2048": "Fusion 2048",
  "astro-dodge": "Évasion Stellaire",
  "brick-blast": "Mur de Plasma",
  "memory-flip": "Mémo Cosmos",
  "morpion-solo": "Morpion Nova",
  "puissance-quatre": "Puissance Orbitale",
  "pulse-tap": "Pulse Pop",
  "simon-orbit": "Simon Orbital",
  "crystal-mines": "Mines de Cristal",
  "eco-arcade-hub": "Eco Arcade Hub (5 jeux)",
  "eco-arcade-hub-3d": "Eco Arcade Hub 3D (3 jeux)",
};

const emptyGame: GameInput = {
  slug: "",
  title: "",
  shortDescription: "",
  description: "",
  category: "Arcade",
  tags: [],
  sourceType: "internal",
  internalGameId: "neon-snake",
  embedUrl: null,
  accentColor: "#7c5cff",
  secondaryColor: "#25e6c8",
  icon: "🎮",
  difficulty: "Facile",
  status: "draft",
  featured: false,
  sortOrder: 100,
};

function toInput(game: Game | null): GameInput {
  if (!game) return emptyGame;
  return {
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    category: game.category,
    tags: game.tags,
    sourceType: game.sourceType,
    internalGameId: game.internalGameId,
    embedUrl: game.embedUrl,
    accentColor: game.accentColor,
    secondaryColor: game.secondaryColor,
    icon: game.icon,
    difficulty: game.difficulty,
    status: game.status,
    featured: game.featured,
    sortOrder: game.sortOrder,
  };
}

interface AdminGameEditorProps {
  game: Game | null;
  saving: boolean;
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  onClose: () => void;
  onSave: (input: GameInput) => Promise<void>;
}

export function AdminGameEditor({
  game,
  saving,
  error,
  fieldErrors,
  onClose,
  onSave,
}: AdminGameEditorProps) {
  const [input, setInput] = useState<GameInput>(() => toInput(game));
  const [tags, setTags] = useState(() => game?.tags.join(", ") ?? "");

  useEffect(() => {
    setInput(toInput(game));
    setTags(game?.tags.join(", ") ?? "");
  }, [game]);

  function update<K extends keyof GameInput>(key: K, value: GameInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function changeSource(sourceType: GameInput["sourceType"]) {
    setInput((current) => ({
      ...current,
      sourceType,
      internalGameId: sourceType === "internal" ? "neon-snake" : null,
      embedUrl: sourceType === "embed" ? "" : null,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      ...input,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      embedUrl: input.sourceType === "embed" ? input.embedUrl : null,
      internalGameId: input.sourceType === "internal" ? input.internalGameId : null,
    });
  }

  function fieldError(name: string) {
    const message = fieldErrors?.[name]?.[0];
    return message ? <small className="field-error">{message}</small> : null;
  }

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="game-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-kicker">{game ? "Modifier la fiche" : "Nouveau contenu"}</span>
            <h2 id="game-editor-title">{game ? game.title : "Ajouter un jeu"}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <div className="form-grid">
            <label className="form-span-2">
              Titre
              <input
                required
                minLength={2}
                maxLength={80}
                value={input.title}
                onChange={(event) => update("title", event.target.value)}
              />
              {fieldError("title")}
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="mon-nouveau-jeu"
                value={input.slug}
                onChange={(event) => update("slug", event.target.value.toLowerCase())}
              />
              {fieldError("slug")}
            </label>
            <label>
              Icône
              <input
                required
                maxLength={16}
                value={input.icon}
                onChange={(event) => update("icon", event.target.value)}
              />
              {fieldError("icon")}
            </label>
            <label className="form-span-2">
              Résumé
              <input
                required
                minLength={10}
                maxLength={180}
                value={input.shortDescription}
                onChange={(event) => update("shortDescription", event.target.value)}
              />
              {fieldError("shortDescription")}
            </label>
            <label className="form-span-2">
              Description
              <textarea
                required
                minLength={20}
                maxLength={2_000}
                rows={4}
                value={input.description}
                onChange={(event) => update("description", event.target.value)}
              />
              {fieldError("description")}
            </label>
            <label>
              Catégorie
              <select
                value={input.category}
                onChange={(event) => update("category", event.target.value as GameInput["category"])}
              >
                {GAME_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Difficulté
              <select
                value={input.difficulty}
                onChange={(event) => update("difficulty", event.target.value as GameInput["difficulty"])}
              >
                {GAME_DIFFICULTIES.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
              </select>
            </label>
            <label className="form-span-2">
              Tags séparés par des virgules
              <input value={tags} onChange={(event) => setTags(event.target.value)} />
              {fieldError("tags")}
            </label>
            <fieldset className="form-span-2 source-picker">
              <legend>Source du jeu</legend>
              <label>
                <input
                  type="radio"
                  name="source"
                  checked={input.sourceType === "internal"}
                  onChange={() => changeSource("internal")}
                />
                Jeu NovaPlay
              </label>
              <label>
                <input
                  type="radio"
                  name="source"
                  checked={input.sourceType === "embed"}
                  onChange={() => changeSource("embed")}
                />
                URL HTML5 externe
              </label>
            </fieldset>
            {input.sourceType === "internal" ? (
              <label className="form-span-2">
                Jeu interne
                <select
                  value={input.internalGameId ?? ""}
                  onChange={(event) =>
                    update("internalGameId", event.target.value as GameInput["internalGameId"])
                  }
                >
                  {INTERNAL_GAME_IDS.map((id) => <option value={id} key={id}>{internalGameLabels[id]}</option>)}
                </select>
                {fieldError("internalGameId")}
              </label>
            ) : (
              <label className="form-span-2">
                URL HTTPS du jeu
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={input.embedUrl ?? ""}
                  onChange={(event) => update("embedUrl", event.target.value)}
                />
                {fieldError("embedUrl")}
              </label>
            )}
            <label>
              Couleur principale
              <span className="color-field">
                <input
                  type="color"
                  value={input.accentColor}
                  onChange={(event) => update("accentColor", event.target.value)}
                />
                <input
                  value={input.accentColor}
                  pattern="#[0-9a-fA-F]{6}"
                  onChange={(event) => update("accentColor", event.target.value)}
                />
              </span>
            </label>
            <label>
              Couleur secondaire
              <span className="color-field">
                <input
                  type="color"
                  value={input.secondaryColor}
                  onChange={(event) => update("secondaryColor", event.target.value)}
                />
                <input
                  value={input.secondaryColor}
                  pattern="#[0-9a-fA-F]{6}"
                  onChange={(event) => update("secondaryColor", event.target.value)}
                />
              </span>
            </label>
            <label>
              État
              <select
                value={input.status}
                onChange={(event) => update("status", event.target.value as GameInput["status"])}
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
              </select>
            </label>
            <label>
              Ordre d’affichage
              <input
                type="number"
                min={0}
                max={100_000}
                value={input.sortOrder}
                onChange={(event) => update("sortOrder", Number(event.target.value))}
              />
            </label>
            <label className="checkbox-field form-span-2">
              <input
                type="checkbox"
                checked={input.featured}
                onChange={(event) => update("featured", event.target.checked)}
              />
              <span>
                Mettre ce jeu en avant
                <small>Il pourra apparaître dans la sélection principale.</small>
              </span>
            </label>
          </div>
          <footer>
            <button className="button button--secondary" type="button" onClick={onClose}>
              Annuler
            </button>
            <button className="button button--primary" type="submit" disabled={saving}>
              <Save size={17} />
              {saving ? "Enregistrement..." : game ? "Enregistrer" : "Créer le jeu"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
