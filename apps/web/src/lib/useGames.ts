import type { PublicGame } from "@novaplay/shared";
import { useEffect, useState } from "react";
import { getGame, getGames, type PublicGameFilters } from "./api";

interface AsyncState<T> {
  data: T;
  error: string | null;
  loading: boolean;
}

export function useGames(filters: PublicGameFilters = {}): AsyncState<PublicGame[]> {
  const [state, setState] = useState<AsyncState<PublicGame[]>>({
    data: [],
    error: null,
    loading: true,
  });
  const search = filters.search ?? "";
  const category = filters.category ?? "";
  const featured = filters.featured;

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, error: null, loading: true }));

    void getGames(
      {
        search: search || undefined,
        category: category || undefined,
        featured,
      },
      controller.signal,
    )
      .then((games) => setState({ data: games, error: null, loading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "Impossible de charger les jeux.";
        setState({ data: [], error: message, loading: false });
      });

    return () => controller.abort();
  }, [search, category, featured]);

  return state;
}

export function useGame(slug: string | undefined): AsyncState<PublicGame | null> {
  const [state, setState] = useState<AsyncState<PublicGame | null>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!slug) {
      setState({ data: null, error: "Ce jeu est introuvable.", loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: null, loading: true });
    void getGame(slug, controller.signal)
      .then((game) => setState({ data: game, error: null, loading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "Impossible de charger ce jeu.";
        setState({ data: null, error: message, loading: false });
      });

    return () => controller.abort();
  }, [slug]);

  return state;
}
