# Commandes - Exercice Dockerization

## Étape 1 — Prise en main du projet

```bash
# Installer les dépendances et lancer le serveur en local
cd server
yarn install
yarn dev
```

Le serveur écoute sur `http://localhost:3000`.  
Tester une route avec Bruno (ex. `GET http://localhost:3000/api/...`).

---

## Étape 2 — Dockerfile du serveur

```bash
# Créer server/Dockerfile (voir fichier), puis builder l'image
docker build -t mfp-server ./server

# Lancer le conteneur pour tester
docker run -p 3000:3000 mfp-server

# Vérifier que le conteneur tourne
docker ps

# Arrêter et supprimer le conteneur de test
docker stop <container_id>
docker rm <container_id>
```

---

## Étape 3 — compose.yml avec serveur + BDD

```bash
# Créer compose.yml à la racine (voir fichier), puis lancer les deux services
docker compose up

# En arrière-plan (detached)
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter les services
docker compose down

# Arrêter et supprimer les volumes (repart d'une BDD vide)
docker compose down -v
```

---

## Étape 4 — Client React : test local puis dockerization

```bash
# Tester le client en local
cd client
yarn install
yarn dev
```

Le client est accessible sur `http://localhost:5173`.

```bash
# Revenir à la racine et builder toutes les images
cd ..
docker compose build

# Lancer tous les services (server + db + client)
docker compose up

# En arrière-plan
docker compose up -d

# Voir les logs d'un service en particulier
docker compose logs -f client
docker compose logs -f server
docker compose logs -f db
```

Le client est accessible sur `http://localhost:80`.

---

## Pour aller plus loin

### 1 & 2 — Health check + restart (compose.yml)

Aucune commande supplémentaire : les directives `healthcheck` et `restart: unless-stopped`  
sont déclarées dans `compose.yml`. Relancer suffit :

```bash
docker compose up -d
```

Vérifier que le serveur attend bien que la BDD soit prête :

```bash
docker compose ps        # colonne "health" doit passer à "healthy" pour db
docker compose logs server   # doit afficher "connected to PgSQL db" après le démarrage de db
```

### 3 — Multi-stage builds (optimisation des images)

```bash
# Rebuilder les images depuis zéro (sans cache) pour voir la taille finale
docker compose build --no-cache

# Comparer les tailles d'images
docker images | grep mfp
# ou
docker image ls

# Inspecter le détail des layers d'une image
docker image history mfp-server
docker image history mfp-client
```

L'image du serveur passe de ~350 Mo à ~250 Mo car le stage de production  
ne contient plus `nodemon`, `ts-node`, `typescript` ni les sources `.ts`.  
L'image du client passe de ~350 Mo à ~50 Mo grâce à `nginx:alpine`.

---

---

# Exercice 2 — Mettre en place une CI

## Étape 2.1 — Repo GitHub public + CI Docker (ghcr.io)

```bash
# S'authentifier sur GitHub CLI (une seule fois)
gh auth login

# Créer le repo public si pas encore fait
gh repo create my-favorite-place --public --source=. --remote=origin --push

# Vérifier que le workflow CI est en place (.github/workflows/docker-image.yml)
# Puis pousser sur main pour déclencher la CI
git add .
git commit -m "feat: add CI workflow"
git push origin main

# Voir l'état des runs CI
gh run list
gh run watch   # suit le run en cours en temps réel
```

Les images sont publiées sur :
- `ghcr.io/<username>/mfp-back:latest`
- `ghcr.io/<username>/mfp-front:latest`

---

## Étape 2.2 — Ajouter des tests Jest

```bash
# Installer Jest, ts-jest et les types dans le dossier server
cd server
yarn add --dev jest @types/jest ts-jest

# Vérifier que le script "test" est bien dans server/package.json
# "test": "jest"

# Lancer les tests en local
yarn test

# Revenir à la racine et pousser (la CI exécutera les tests automatiquement)
cd ..
git add server/package.json server/yarn.lock server/jest.config.js \
        server/src/utils/getDistance.test.ts \
        .github/workflows/docker-image.yml
git commit -m "feat: add Jest tests and update CI to run tests"
git push origin main

# Suivre le run
gh run list --limit 1
gh run watch
```

---

## Étape 2.3 — Protéger la branche main

```bash
# Via l'interface GitHub :
# Settings → Branches → Add rule → Branch name: main
# ✅ Require status checks to pass before merging
#    → Chercher et ajouter le job : "Tests"
# ✅ Require a pull request before merging
# ✅ Do not allow bypassing the above settings

# Ou via GitHub CLI (nécessite un token avec scope admin:repo) :
gh api repos/KazSoda/my-favorite-place/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

### Tester la protection (casser les tests volontairement)

```bash
# Créer une branche de test
git checkout -b test/break-distance

# Casser getDistance.ts (ex. retourner 0 au lieu du calcul)
# Puis pousser et créer une PR
git add server/src/utils/getDistance.ts
git commit -m "test: break getDistance"
git push origin test/break-distance

# Créer la PR
gh pr create --title "Test: broken distance" --body "PR intentionnellement cassée pour tester la protection"

# Vérifier que la CI échoue et que le merge est bloqué
gh pr checks

# Nettoyer après la démonstration
git checkout main
git branch -d test/break-distance
gh pr close <PR_NUMBER>
```

---

# Exercice 3 — Vérifier les images produites (compose.prod.yml)

```bash
# S'authentifier auprès de ghcr.io pour pouvoir pull les images privées
echo $CR_PAT | docker login ghcr.io -u <username> --password-stdin
# (CR_PAT = Personal Access Token GitHub avec scope read:packages)
# Si les images sont publiques, pas besoin de login

# Lancer la stack en utilisant les images publiées sur ghcr.io
docker compose -f compose.prod.yml up -d

# Voir les logs
docker compose -f compose.prod.yml logs -f

# Vérifier que les conteneurs tournent
docker compose -f compose.prod.yml ps

# Arrêter
docker compose -f compose.prod.yml down

# Mettre à jour les images (pull la dernière version)
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

---

## Commandes utiles au quotidien

```bash
# Rebuilder et relancer un seul service
docker compose up -d --build server

# Voir les ressources consommées par les conteneurs
docker stats

# Ouvrir un shell dans un conteneur
docker compose exec server sh
docker compose exec db psql -U postgres

# Supprimer toutes les images/conteneurs inutilisés
docker system prune
```
