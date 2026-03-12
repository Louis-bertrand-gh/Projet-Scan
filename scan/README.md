# Scan — Application HACCP & Réassort (MVP)

Application SaaS de traçabilité HACCP et de gestion de réassort pour la chaîne de campings **Huttopia**.

## Stack Technique

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript (typage strict)
- **Styling** : Tailwind CSS
- **Icônes** : Lucide React
- **State** : React Context API

## Installation

```bash
# 1. Installer Node.js (v18+) : https://nodejs.org/
# 2. Installer les dépendances
cd scan
npm install

# 3. Lancer en mode développement
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
scan/
├── public/
│   └── manifest.json          # Configuration PWA
├── src/
│   ├── app/                   # Pages Next.js (App Router)
│   │   ├── layout.tsx         # Layout racine
│   │   ├── ClientProviders.tsx# Providers côté client
│   │   ├── globals.css        # Styles globaux + Tailwind
│   │   ├── page.tsx           # Dashboard (accueil)
│   │   ├── scan/page.tsx      # Module Smart Scan
│   │   ├── reassort/page.tsx  # Dashboard réassort
│   │   └── parametres/page.tsx# Paramètres + thèmes
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx     # Layout hybride Desktop/Mobile
│   │   │   ├── Sidebar.tsx    # Navigation Desktop
│   │   │   ├── BottomNav.tsx  # Navigation Mobile
│   │   │   └── Header.tsx     # Header Mobile
│   │   ├── scan/
│   │   │   ├── CameraScanner.tsx   # Capture caméra + OCR
│   │   │   └── ValidationForm.tsx  # Formulaire validation
│   │   └── reassort/
│   │       ├── ReassortDashboard.tsx # Vue réassort
│   │       └── ProductCard.tsx       # Carte produit
│   ├── contexts/
│   │   ├── AppContext.tsx     # Contexte global (user, site, pdv)
│   │   └── ThemeContext.tsx   # Contexte thème visuel
│   ├── data/
│   │   ├── mockData.ts       # Données simulées
│   │   └── themes.ts         # Thèmes visuels nature
│   ├── lib/
│   │   └── ocrSimulation.ts  # Simulation OCR
│   └── types.ts              # Modèle de données TypeScript
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Fonctionnalités MVP

- **Dashboard** : KPI, alertes stock, accès rapide
- **Smart Scan** : Capture caméra → OCR simulé → Validation
- **Réassort** : Filtrage par PDV, marquage "à commander" (persistant)
- **Thèmes** : 9 thèmes nature (Forêt, Océan, Montagne, Plaine, Plage, Noir, Blanc, Lavande, Automne)
- **Navigation hybride** : Sidebar Desktop + Bottom Nav Mobile
