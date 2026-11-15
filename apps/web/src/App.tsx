import { Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { AdminPage } from "./pages/AdminPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="game/:slug" element={<GamePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="admin/login" element={<AdminLoginPage />} />
      <Route path="admin" element={<AdminPage />} />
      <Route path="admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
