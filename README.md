# DigiSomething — Digimon TCG Deck Builder

A Vue 3 + TypeScript web app for browsing Digimon cards, building decks, reading news, and exploring meta decks.

## Stack
- **Frontend:** Vue 3 + TypeScript (MVVM)
- **State:** Pinia
- **Routing:** Vue Router
- **Styling:** Tailwind CSS v4
- **Backend:** Firebase (Auth, Firestore, Hosting)
- **Card Data:** [digimoncard.io API](https://digimoncard.io/api-public)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Copy `.env.example` to `.env` and fill in your Firebase project values:
```bash
cp .env.example .env
```
Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com) and enable:
- Authentication → Google provider
- Firestore Database
- Hosting

### 3. Run dev server
```bash
npm run dev
```

### 4. Deploy to Firebase
```bash
npm run build
firebase deploy
```

## Structure
```
src/
├── models/        # TypeScript interfaces (Card, Deck, User)
├── services/      # API & Firebase service layer
├── stores/        # Pinia stores (ViewModel)
├── composables/   # Reusable reactive logic
├── router/        # Vue Router + auth guards
├── components/    # Reusable UI components
│   ├── layout/
│   ├── cards/
│   ├── filters/
│   └── deck/
└── views/         # Page-level components
```
