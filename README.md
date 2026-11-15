# NovaPlay

NovaPlay est une plateforme de jeux web instantanés, pensée pour ordinateur, tablette et mobile. Les joueurs accèdent au catalogue sans compte, tandis qu’une console d’administration protégée permet de gérer les contenus.

L’identité visuelle, les illustrations générées en CSS/SVG et les dix-huit expériences jouables sont originales. Aucun contenu ni élément graphique de Playgama n’est copié.

## Fonctionnalités

- catalogue public responsive avec recherche et filtres par catégorie ;
- sélection de jeux mis en avant ;
- favoris et historique récent enregistrés localement dans le navigateur ;
- lecteur intégré avec mode plein écran ;
- dix jeux HTML5 autonomes, un hub de cinq jeux Canvas (2D) et un hub de trois jeux Three.js (3D), tous jouables au clavier, à la souris et au tactile ;
- icônes illustrées originales (SVG vectoriel) pour chacun des huit jeux des deux hubs ;
- niveaux de difficulté (Facile / Normal / Difficile) réglables par jeu, affectant vitesse, cadence et récompenses ;
- modes de jeu Solo / Vs Nova (IA) / 2 Joueurs sur Neon Canopy Rally, Crop Collapse, Chroma Sort et Stick Clash ;
- personnages à l'anatomie humaine détaillée et habillée : mineur et défenseur en 3D (Crystal Quarry, Stellar Siege), coureur et soldats en 2D (Canopy Runner, Stick Clash) ;
- économie partagée entre les deux hubs, boutique cosmétique, multiplicateur global et six objets consommables (bouclier, chrono ralenti, méga multiplicateur, aimant, résurrection, kit de démarrage), tous enregistrés dans `localStorage` ;
- ajout de jeux HTML5 externes via une URL HTTPS ;
- administration sécurisée par cookie HTTP-only ;
- publication, mise en brouillon, modification et suppression des fiches ;
- statistiques de catalogue et compteur de parties ;
- base SQLite initialisée automatiquement avec les douze fiches du catalogue.

## Jeux inclus

### Eco Arcade Hub (2D, Canvas vanilla)

1. Harvest Clicker — idle/incremental, difficulté et kit de démarrage.
2. Crop Collapse — fusion physique, modes Solo / Vs Nova / 2 Joueurs.
3. Canopy Runner — course sans fin, personnage humain habillé, bouclier/chrono ralenti/résurrection.
4. Chroma Sort — puzzle en grille, modes Solo / Vs Nova / 2 Joueurs.
5. Stick Clash — auto-battler, soldats habillés, mode 2 Joueurs avec camp adverse jouable.

### Eco Arcade Hub 3D (Three.js vendoré localement)

1. Neon Canopy Rally — rally arcade en drift sur piste procédurale, modes Solo / Vs Nova / 2 Joueurs.
2. Crystal Quarry — bac à sable voxel (minage/construction, cycle jour/nuit), mineur avec bras et pioche visibles.
3. Stellar Siege — défense en vagues avec améliorations permanentes, défenseur humanoïde animant la tourelle.

### Jeux autonomes

1. Neon Serpent
2. Fusion 2048
3. Évasion Stellaire
4. Mur de Plasma
5. Mémo Cosmos
6. Morpion Nova
7. Puissance Orbitale
8. Pulse Pop
9. Simon Orbital
10. Mines de Cristal

## Technologies libres

| Couche | Technologie |
|---|---|
| Interface | React, TypeScript, Vite |
| Rendu 3D (hub 3D) | Three.js (vendoré localement, aucun CDN) |
| Navigation | React Router |
| Icônes | Lucide |
| API | Node.js, Express |
| Données | SQLite via le module natif `node:sqlite` |
| Validation | Zod |
| Sécurité HTTP | Helmet, Express Rate Limit |
| Tests | Vitest, Supertest |
| Qualité | ESLint, TypeScript |

Toutes les dépendances utilisées sont gratuites et open source. Aucun service cloud payant n’est requis.

## Prérequis

- Node.js 22.13 ou une version supérieure ;
- npm 10 ou une version supérieure.

## Installation

Depuis PowerShell :

```powershell
Set-Location "C:\Users\HAKAN\Desktop\NovaPlay"
npm install
Copy-Item "apps\api\.env.example" "apps\api\.env"
npm run dev
```

Le site est ensuite accessible sur <http://localhost:5173> et l’API sur <http://127.0.0.1:3001>.

### Identifiants de développement

Lorsque aucun fichier `.env` n’est configuré, le serveur utilise uniquement en mode développement :

- identifiant : `admin`
- mot de passe : `NovaPlay-Dev-Admin-2026!`

La console se trouve sur <http://localhost:5173/admin>.

## Configuration

Les variables sont lues depuis `apps/api/.env` :

```dotenv
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/novaplay.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-long-random-password
SESSION_SECRET=replace-with-at-least-32-random-characters
WEB_ORIGIN=http://localhost:5173
```

En production, `ADMIN_PASSWORD` et `SESSION_SECRET` sont obligatoires. Un secret peut être généré avec :

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

`WEB_ORIGIN` est l’origine navigateur autorisée pour les requêtes d’écriture (connexion, administration, compteur de parties). En développement, `localhost` et `127.0.0.1` sont acceptés indifféremment, ce qui permet d’ouvrir l’adresse affichée par Vite ; en production, seule la valeur exacte de `WEB_ORIGIN` est acceptée.

## Commandes

| Commande | Action |
|---|---|
| `npm run dev` | Lance l’API, l’interface et la compilation partagée en mode développement |
| `npm run typecheck` | Vérifie tous les types TypeScript |
| `npm run lint` | Exécute ESLint |
| `npm test` | Exécute les tests de l’API et des jeux |
| `npm run build` | Produit les fichiers de production |
| `npm start` | Lance le serveur de production après un build |

## Production

1. Copiez puis renseignez `apps/api/.env`.
2. Utilisez `NODE_ENV=production`.
3. Définissez un mot de passe fort et un secret de session aléatoire.
4. Définissez `WEB_ORIGIN` avec l’origine HTTPS publique exacte.
5. Exécutez :

```powershell
npm ci
npm run build
npm start
```

Express sert alors l’interface compilée et l’API depuis le même processus. Placez le serveur derrière un reverse proxy HTTPS tel que Caddy ou Nginx.

La base est stockée par défaut dans `apps/api/data/novaplay.db`. Sauvegardez régulièrement ce fichier en production.

## Structure

```text
NovaPlay/
├── apps/
│   ├── api/       API Express, SQLite, authentification et tests
│   └── web/       interface React, administration et mini-jeux
│       └── public/
│           ├── arcade-hub.html      hub 2D autonome (5 jeux, Canvas vanilla)
│           ├── arcade-hub-3d.html   hub 3D autonome (3 jeux, Three.js)
│           ├── games3d/             moteurs et HUD des jeux 3D (modules ES)
│           └── vendor/three/        Three.js vendoré localement
├── packages/
│   └── shared/    types et constantes partagés
└── package.json   scripts et espaces de travail npm
```

## Ajouter un jeu

- **Jeu externe** : utilisez la console d’administration et fournissez une URL HTTPS compatible avec une intégration en `iframe`.
- **Jeu natif NovaPlay** : créez un composant dans `apps/web/src/games`, ajoutez son identifiant à `packages/shared/src/index.ts`, puis enregistrez-le dans `apps/web/src/games/index.tsx`.

Les jeux externes sont ouverts dans une `iframe` isolée. Vérifiez néanmoins les droits de distribution et la politique d’intégration de chaque jeu avant publication.
