# Déploiement — Planning Ordonnancement ENOGIA 2026

## ⚠️ Avant de commencer : 2 choses à remplacer

### 1. `src/firebase.js`
Remplace les valeurs `TON_API_KEY`, `TON_PROJET`, etc. par celles de ton
projet Firebase existant :
- Console Firebase → ⚙️ Paramètres du projet → Tes applications
- Si tu n'as pas d'app "Web" (icône `</>`), crée-la → choisis "Pas besoin
  de Firebase Hosting" (on utilise GitHub Pages)
- Copie l'objet `firebaseConfig` fourni, colle-le dans le fichier
- Vérifie que **Firestore Database** est activé (Build → Firestore
  Database) — c'est lui qui stocke les données du planning

### 2. `package.json`
Remplace `TON-USERNAME` dans le champ `"homepage"` par ton nom
d'utilisateur GitHub :
```json
"homepage": "https://TON-USERNAME.github.io/planning-enogia-2026",
```

---

## Étapes de déploiement

### 1. Créer le repository GitHub
- Va sur [github.com](https://github.com) → **New repository**
- Nom : `planning-enogia-2026`
- Visibilité : **Public** (nécessaire pour GitHub Pages gratuit)
- Ne pas cocher "Add README" → **Create repository**

### 2. Installer Node.js (si pas déjà fait)
- [nodejs.org](https://nodejs.org) → télécharger la version LTS → installer

### 3. Préparer le projet en local
Dans un terminal, à l'intérieur de ce dossier `planning-enogia-2026/` :
```bash
npm install
```
Cela installe React, Firebase et les autres dépendances (peut prendre 1-2 minutes).

### 4. Tester en local (optionnel mais recommandé)
```bash
npm start
```
Le dashboard s'ouvre sur `http://localhost:3000`. Vérifie que la connexion
Firestore fonctionne (pas d'erreur dans la console du navigateur) avant de
déployer.

### 5. Connecter le projet à GitHub
```bash
git init
git add .
git commit -m "Premier déploiement du dashboard"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/planning-enogia-2026.git
git push -u origin main
```

### 6. Déployer sur GitHub Pages
```bash
npm run deploy
```
Cette commande build le projet et publie automatiquement le contenu sur
une branche `gh-pages`.

### 7. Activer GitHub Pages
- Sur GitHub → ton repo → **Settings** → **Pages**
- Source : branche `gh-pages` / dossier `/ (root)` → **Save**
- Attends 1-2 minutes, l'URL apparaît en haut de la page

Ton dashboard sera accessible à :
**`https://TON-USERNAME.github.io/planning-enogia-2026`**

---

## Mettre à jour le dashboard plus tard

Si tu modifies le code (`src/App.js` ou autre) :
```bash
git add .
git commit -m "Description de la modif"
git push
npm run deploy
```

---

## Règles de sécurité Firestore (recommandé)

Par défaut, Firestore peut être configuré en mode "test" qui autorise tout
le monde à lire/écrire sans restriction — pratique pour démarrer, mais à
sécuriser avant un usage en production avec toute l'équipe. Dans la
console Firebase → Firestore Database → Règles, tu peux par exemple
restreindre l'écriture aux seules requêtes contenant le bon PIN côté
applicatif (déjà fait dans le dashboard avec le code "2214"), ou mettre en
place une authentification Firebase plus robuste si besoin.

## Problèmes fréquents

- **Page blanche après déploiement** : vérifie que `homepage` dans
  `package.json` correspond exactement à l'URL GitHub Pages.
- **Erreur Firestore "permission-denied"** : les règles de sécurité
  Firestore bloquent l'accès — vérifie les règles dans la console Firebase.
- **Le bouton "Importer" ne sauvegarde rien** : vérifie que Firestore
  Database est bien activé et que `firebaseConfig` est correctement rempli.
