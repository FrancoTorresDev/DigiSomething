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
npm run firebase:use
npm run deploy:prod
```

## Production Publish Checklist

### 1. One-time Firebase CLI setup
Install and authenticate Firebase CLI if needed:
```bash
npm install -g firebase-tools
firebase login
```

### 2. Project binding
This repo is configured for Firebase project `digisomething-b296c`.
You can rebind manually anytime:
```bash
npm run firebase:use
```

### 3. Build and deploy options
- Full deploy (Hosting + Functions):
```bash
npm run deploy:prod
```
- Hosting only:
```bash
npm run deploy:hosting
```
- Generic deploy shortcut:
```bash
npm run deploy
```

### 4. Validate live site
After deploy, verify:
- Main app loads on Firebase Hosting URL.
- Hard refresh on an internal route works (SPA rewrite to `index.html`).
- API proxies work via `/digimon-api/**` and `/justtcg-api/**`.

## Custom Domain (Firebase Hosting)

### 1. Add domain in Firebase Console
Go to **Firebase Console -> Hosting -> Add custom domain** and enter:
- apex domain (example: `example.com`), and/or
- subdomain (example: `www.example.com`)

### 2. Create DNS records at your registrar
Firebase will provide exact records in the wizard:
- `A` / `AAAA` records for apex domains
- `CNAME` records for subdomains

Use exactly the host/value pairs shown in Firebase.

### 3. Verify ownership and wait for propagation
- DNS propagation can take from minutes up to 24-48 hours.
- Keep DNS proxying disabled while verifying (for providers like Cloudflare, set DNS-only until SSL is provisioned).

### 4. SSL certificate provisioning
Firebase automatically provisions and renews TLS certificates after DNS verification.

### 5. Set canonical redirect
Choose one canonical domain and redirect the other:
- `www -> apex`, or
- `apex -> www`

Configure redirect inside Hosting domain settings.

### 6. Final checks
- `https://your-domain` opens without certificate warnings
- Redirect behavior matches your canonical choice
- App routes and proxy endpoints behave the same as `*.web.app`

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
