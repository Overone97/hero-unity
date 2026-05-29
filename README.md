# Hero Unity

Prototype fondateur d’un **Auto-RPG web** pensé pour être jouable sur navigateur, rapide à itérer, et visuellement séduisant dès les premières versions.

## Vision

Le joueur équipe son héros, choisit une doctrine de combat, lance une expédition automatique, puis optimise son build run après run pour survivre plus loin que les autres.

## Stack

- **Frontend**: React + TypeScript + Vite
- **Rendu / scène**: base UI stylisée, intégration Phaser prévue pour la simulation jouable
- **Déploiement**: GitHub Pages
- **Versioning visible**: affiché en jeu en haut à gauche

## Structure

```text
src/
  config/       constantes globales
  data/         données prototype et contenu temporaire
  game/         future simulation / scènes / systèmes de combat
  App.tsx       shell UI actuelle
  App.css       direction visuelle initiale
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Règle projet

Chaque PR fait évoluer la version (`package.json`) et cette version est visible directement dans le jeu.

## Première milestone

- shell premium jouable sur navigateur
- identité visuelle dark-fantasy arcade
- vrai hub joueur avec profil, équipement et inventaire interactif
- première expédition auto simulée + premier système de loot
- pipeline de déploiement GitHub Pages
