# Plan de Migration — Pula Pay

> **Objectifs:**
> 1. Passer des wallets **Developer-Controlled** aux wallets **User-Controlled** (Circle)
> 2. Migrer vers le réseau **Base** (Base Sepolia en testnet, Base en mainnet)
>
> **Contexte:** Aucun utilisateur en production → migration sans contrainte de rétrocompatibilité.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Impact architectural](#2-impact-architectural)
3. [Phase 1 — Réseau Base](#phase-1--réseau-base)
4. [Phase 2 — Wallets User-Controlled (Circle)](#phase-2--wallets-user-controlled-circle)
5. [Phase 3 — Backend : Adapter & Flows](#phase-3--backend--adapter--flows)
6. [Phase 4 — Mobile : Nouveau flow UX](#phase-4--mobile--nouveau-flow-ux)
7. [Phase 5 — Base de données](#phase-5--base-de-données)
8. [Phase 6 — Configuration & Infra](#phase-6--configuration--infra)
9. [Checklist de validation](#checklist-de-validation)
10. [Risques & considérations](#risques--considérations)

---

## 1. Vue d'ensemble

### Différences clés : Developer-Controlled vs User-Controlled

| Aspect | Developer-Controlled (actuel) | User-Controlled (cible) |
|---|---|---|
| Custody des clés | Backend (entity secret) | Utilisateur (PIN / Passkey) |
| Signature des transactions | Backend signe silencieusement | Utilisateur confirme via challenge |
| Création de wallet | Automatique à l'inscription | Initié par backend, complété par l'utilisateur (setup PIN) |
| SDK | `@circle-fin/developer-controlled-wallets` | `@circle-fin/user-controlled-wallets` |
| Entity Secret | Requis (RSA) | Non requis |
| User Token | Non | Oui — Circle émet un token par utilisateur |
| UX de signature | Invisible | Challenge visible (PIN / biométrie) |

### Résumé du flow User-Controlled

```
[Backend]                    [Circle]                    [Mobile]
   │                            │                            │
   │── POST /user/token ────────►                            │
   │◄── { userToken, encryptionKey } ──────────────────────►│
   │                            │   (mobile stocke le token) │
   │                            │                            │
   │── POST /wallets ───────────►                            │
   │◄── { walletId, challengeId } ─────────────────────────►│
   │                            │   (mobile résout challenge │
   │                            │    = setup PIN utilisateur)│
   │                            │                            │
   │  [Lors d'un transfert]     │                            │
   │── POST /transactions ──────►                            │
   │◄── { challengeId } ───────────────────────────────────►│
   │                            │   (mobile demande PIN)     │
   │                            │◄── user confirme ──────────│
   │◄── transaction completed ──│                            │
```

---

## 2. Impact architectural

### Fichiers impactés

#### Backend `back2/`
| Fichier | Type de changement |
|---|---|
| `src/infrastructure/adapters/circle/CircleWalletAdapter.ts` | Réécriture complète |
| `src/application/commands/CreateWalletHandler.ts` | Logique de création modifiée |
| `src/application/commands/ExecuteTransferHandler.ts` | Flow challenge ajouté |
| `src/application/commands/InitiateDepositHandler.ts` | Ajustement réseau |
| `src/application/commands/InitiateWithdrawHandler.ts` | Ajustement réseau |
| `src/infrastructure/http/controllers/WalletController.ts` | Nouveaux endpoints (user token, challenge) |
| `src/shared/config/index.ts` | Nouvelles variables d'env |
| `prisma/schema.prisma` | Nouveaux champs wallet |
| `package.json` | Changement de SDK Circle |

#### Mobile `mobile/`
| Fichier | Type de changement |
|---|---|
| `src/api/wallet.ts` | Nouveaux appels API |
| `src/store/walletStore.ts` | Nouveau state (userToken, challengeId) |
| `src/hooks/use-transfert.ts` | Flow challenge |
| `src/hooks/use-deposit.ts` | Flow challenge (si applicable) |
| `src/app/(main)/wallet/transfert.tsx` | UI challenge PIN |
| `src/app/(main)/wallet/deposit.tsx` | UI challenge PIN |
| `src/app/(auth)/register.tsx` | Setup PIN à l'inscription |
| `package.json` | SDK Circle mobile (si applicable) |

---

## Phase 1 — Réseau Base

### 1.1 Configuration réseau

**Fichier :** `back2/src/shared/config/index.ts`

```typescript
// Avant
DEFAULT_BLOCKCHAIN: 'POLYGON_AMOY'

// Après
DEFAULT_BLOCKCHAIN: 'BASE_SEPOLIA'   // testnet
// ou
DEFAULT_BLOCKCHAIN: 'BASE'           // mainnet
```

**Mapping réseau à mettre à jour dans `CircleWalletAdapter.ts` :**

```typescript
// Avant
const NETWORK_MAPPING = {
  POLYGON_AMOY: 'MATIC-AMOY',
  ETH_SEPOLIA:  'ETH-SEPOLIA',
  POLYGON:      'MATIC',
  ETHEREUM:     'ETH',
  ARBITRUM:     'ARB',
}

// Après
const NETWORK_MAPPING = {
  BASE_SEPOLIA: 'BASE-SEPOLIA',   // testnet
  BASE:         'BASE',           // mainnet
  // conserver les autres pour compatibilité éventuelle
}
```

### 1.2 Token IDs USDC sur Base

Récupérer les token IDs via la Circle API ou le dashboard :

```
USDC sur Base Sepolia : à récupérer depuis Circle Dashboard
USDC sur Base mainnet : à récupérer depuis Circle Dashboard
```

**Variables d'env à mettre à jour :**
```env
CIRCLE_USDC_TOKEN_ID=<id-usdc-base-sepolia>
DEFAULT_BLOCKCHAIN=BASE_SEPOLIA
```

### 1.3 Coinbase CDP Onramp/Offramp

Vérifier que Coinbase CDP supporte Base Sepolia / Base pour le on/offramp.
- Si oui : mettre à jour `network` dans `CoinbaseCdpOnRampAdapter.ts`
- Si non : le on/offramp reste en USD sur un réseau supporté, bridge manuel

---

## Phase 2 — Wallets User-Controlled (Circle)

### 2.1 Changement de SDK

**`back2/package.json` :**
```json
// Retirer
"@circle-fin/developer-controlled-wallets": "..."

// Ajouter
"@circle-fin/user-controlled-wallets": "^2.0.0"
```

> **Note :** `@circle-fin/user-controlled-wallets` est déjà listé dans `package.json` — vérifier s'il est réellement utilisé ou juste déclaré.

### 2.2 Nouveaux endpoints Circle (User-Controlled API)

| Opération | Endpoint Circle |
|---|---|
| Créer un user token | `POST /v1/w3s/users/token` |
| Initialiser un wallet | `POST /v1/w3s/user/wallets` |
| Créer un transfert (challenge) | `POST /v1/w3s/user/transactions/transfer` |
| Statut d'un challenge | `GET /v1/w3s/user/challenges/{id}` |
| Wallet PIN setup | Via SDK mobile Circle |

### 2.3 Suppression de l'Entity Secret

Les wallets User-Controlled **ne nécessitent pas** l'entity secret RSA pour signer les transactions. Retirer :
- La logique RSA de chiffrement dans `CircleWalletAdapter.ts`
- La variable d'env `CIRCLE_ENTITY_SECRET`
- Le package `node-forge` si utilisé uniquement pour ça

### 2.4 Nouveau concept : User Token Circle

Chaque utilisateur Circle possède un **userToken** et une **encryptionKey** :
- `userToken` : utilisé pour les appels API Circle au nom de l'utilisateur
- `encryptionKey` : utilisée par le SDK mobile Circle pour chiffrer le PIN

Ces données sont **éphémères** (valides ~1h) et doivent être régénérées à la demande.

---

## Phase 3 — Backend : Adapter & Flows

### 3.1 `CircleWalletAdapter.ts` — Réécriture

```typescript
class CircleWalletAdapter {
  // NOUVEAU : Créer un user token Circle
  async createUserToken(userId: string): Promise<{ userToken: string; encryptionKey: string }>

  // MODIFIÉ : Initier la création de wallet (retourne un challengeId)
  async initiateWalletCreation(userToken: string): Promise<{ walletId: string; challengeId: string }>

  // MODIFIÉ : Initier un transfert (retourne un challengeId)
  async initiateTransfer(userToken: string, params: TransferParams): Promise<{ challengeId: string }>

  // NOUVEAU : Vérifier le statut d'un challenge
  async getChallengeStatus(userToken: string, challengeId: string): Promise<ChallengeStatus>

  // Inchangé
  async getWallet(circleWalletId: string): Promise<WalletDetails>
  async getBalance(circleWalletId: string): Promise<BalanceDetails>
}
```

### 3.2 Nouveaux endpoints API Backend

**`WalletController.ts` — Ajouter :**

```
POST /wallet/user-token
  → Génère un Circle userToken + encryptionKey pour l'utilisateur authentifié
  → Response: { userToken, encryptionKey }

GET  /wallet/challenge/:challengeId
  → Vérifie le statut d'un challenge Circle
  → Response: { status: 'PENDING' | 'COMPLETED' | 'FAILED' }

POST /wallet/setup
  → Initie la création de wallet user-controlled
  → Response: { walletId, challengeId }
```

### 3.3 `CreateWalletHandler.ts` — Modification

```typescript
// Avant : création immédiate, wallet ACTIVE direct
async execute(userId: string) {
  const wallet = await circleAdapter.createWallet(...)
  // wallet ACTIVE immédiatement
}

// Après : création en deux temps (initiation + challenge résolu côté mobile)
async execute(userId: string) {
  const { userToken } = await circleAdapter.createUserToken(userId)
  const { walletId, challengeId } = await circleAdapter.initiateWalletCreation(userToken)
  // Wallet en état PENDING_SETUP jusqu'à ce que le mobile résolve le challenge
  await walletRepo.create({ walletId, status: 'PENDING_SETUP', challengeId })
  return { challengeId, userToken, encryptionKey }
}
```

### 3.4 `ExecuteTransferHandler.ts` — Modification

```typescript
// Après : initie le transfert, retourne un challenge pour le mobile
async execute(command: TransferCommand) {
  const { userToken } = await circleAdapter.createUserToken(command.userId)
  const { challengeId } = await circleAdapter.initiateTransfer(userToken, params)
  // Transaction en état PENDING_CHALLENGE
  await txRepo.create({ ..., status: 'PENDING_CHALLENGE', challengeId })
  return { transactionId, challengeId, userToken, encryptionKey }
}
```

### 3.5 Webhook / Polling Challenge

Ajouter un worker BullMQ `challenge-poll.worker.ts` :
- Surveille les challenges en `PENDING_CHALLENGE`
- Vérifie périodiquement via Circle API
- Met à jour le statut de la transaction quand challenge `COMPLETED`

---

## Phase 4 — Mobile : Nouveau flow UX

### 4.1 Dépendance : Circle Mobile SDK

Le SDK mobile Circle (`@circle-fin/w3s-pw-web-sdk` ou React Native équivalent) gère :
- L'affichage du setup PIN / biométrie
- La résolution des challenges côté client

```json
// mobile/package.json — à ajouter
"@circle-fin/w3s-pw-react-native-sdk": "latest"
```

> **À vérifier :** Circle propose un Web SDK et potentiellement un React Native SDK. Si pas de RN SDK, utiliser WebView + Circle Web SDK.

### 4.2 Flow d'inscription (Register) — Modification

```
Avant:
  Register → Backend crée wallet auto → Dashboard

Après:
  Register
    → Backend crée user Circle + demande userToken
    → Backend initie wallet (retourne challengeId + encryptionKey)
    → Mobile affiche setup PIN (Circle SDK)
    → Utilisateur crée son PIN
    → Circle confirme wallet ACTIVE
    → Dashboard
```

**`mobile/src/app/(auth)/register.tsx` :**
- Après inscription, appeler `POST /wallet/setup`
- Récupérer `{ challengeId, userToken, encryptionKey }`
- Lancer le Circle SDK pour le setup PIN
- Attendre confirmation avant de naviguer vers Dashboard

### 4.3 Flow de transfert — Modification

```
Avant:
  Saisie montant → Confirmer → Backend transfère → Succès

Après:
  Saisie montant
    → Confirmer
    → Backend initie transfert → retourne challengeId + encryptionKey
    → Mobile affiche confirmation PIN (Circle SDK)
    → Utilisateur entre son PIN
    → Circle signe et exécute le transfert
    → Mobile poll statut → Succès
```

**`mobile/src/hooks/use-transfert.ts` :**
```typescript
const transfer = async (params) => {
  // 1. Obtenir un userToken
  const { userToken, encryptionKey } = await api.getUserToken()
  // 2. Initier le transfert
  const { challengeId, transactionId } = await api.initiateTransfer(params)
  // 3. Lancer Circle SDK pour PIN
  await CircleSDK.execute({ userToken, encryptionKey, challengeId })
  // 4. Poll statut
  return trackTransaction(transactionId)
}
```

### 4.4 Gestion du userToken (Store)

**`mobile/src/store/walletStore.ts` — Ajouter :**
```typescript
interface WalletStore {
  // ...existant

  // NOUVEAU
  getUserToken: () => Promise<{ userToken: string; encryptionKey: string }>
}
```

> Le userToken expire (~1h). Ne pas persister en storage — le regénérer à la demande.

### 4.5 Nouveau composant : `circle-challenge-modal.tsx`

Composant réutilisable qui :
- Prend `{ challengeId, userToken, encryptionKey }`
- Lance le Circle SDK (WebView ou SDK natif)
- Expose `onSuccess` / `onFailure` callbacks

---

## Phase 5 — Base de données

### 5.1 Migration Prisma

**`prisma/schema.prisma` — Modifications :**

```prisma
model Wallet {
  // ...champs existants

  // MODIFIER
  blockchain    String   @default("BASE_SEPOLIA")  // était POLYGON_AMOY

  // AJOUTER
  circleUserId  String?  @unique  // ID utilisateur côté Circle
  custodyType   WalletCustodyType @default(USER_CONTROLLED)

  // SUPPRIMER (ou garder pour compatibilité)
  // entitySecretCiphertext  String?
}

model Transaction {
  // ...champs existants

  // AJOUTER
  challengeId   String?  // Circle challengeId en attente
}

enum WalletCustodyType {
  DEVELOPER_CONTROLLED
  USER_CONTROLLED
}

// MODIFIER les valeurs par défaut de blockchain
enum BlockchainNetwork {
  BASE_SEPOLIA
  BASE
  POLYGON_AMOY   // garder pour référence historique
  POLYGON
  ETH_SEPOLIA
  ETHEREUM
}
```

### 5.2 Nouvelle migration

```bash
npx prisma migrate dev --name migrate_to_base_user_controlled
```

### 5.3 Suppression des données existantes (si dev)

Puisqu'il n'y a pas d'utilisateurs en production :
```bash
npx prisma migrate reset
```

---

## Phase 6 — Configuration & Infra

### 6.1 Variables d'environnement

**`.env` — Backend :**
```env
# SUPPRIMER
CIRCLE_ENTITY_SECRET=...
CIRCLE_WALLET_SET_ID=...

# MODIFIER
DEFAULT_BLOCKCHAIN=BASE_SEPOLIA
CIRCLE_USDC_TOKEN_ID=<usdc-token-id-base-sepolia>

# GARDER
CIRCLE_API_KEY=...

# AJOUTER (si applicable)
CIRCLE_APP_ID=<app-id-pour-user-controlled>
```

### 6.2 Circle Dashboard — Configuration

- [ ] Créer une nouvelle App de type **User-Controlled Wallets**
- [ ] Obtenir le nouvel API Key pour User-Controlled
- [ ] Activer le réseau **Base Sepolia** (testnet)
- [ ] Activer le réseau **Base** (mainnet)
- [ ] Récupérer les token IDs USDC pour Base Sepolia et Base
- [ ] Configurer les webhooks Circle pour les événements de challenge

### 6.3 Coinbase CDP — Vérification Base

- [ ] Vérifier le support Base Sepolia pour l'onramp en test
- [ ] Vérifier le support Base pour l'onramp en production
- [ ] Mettre à jour le paramètre `network` dans `CoinbaseCdpOnRampAdapter.ts`

---

## Checklist de validation

> **Status : Migration implémentée** (2026-03-17) — Éléments restants : Prisma migrate + variables d'env

### Backend
- [x] `CircleWalletAdapter` réécrit — API Circle User-Controlled (sans entity secret)
- [x] `POST /wallet` retourne un challenge (challengeId + userToken + encryptionKey + appId)
- [x] `POST /wallet/confirm-setup` crée le wallet local après résolution PIN
- [x] `ExecuteTransferHandler` retourne challengeId + encryptionKey
- [x] Réseau configuré sur `BASE_SEPOLIA` (default)
- [x] Entity Secret + RSA supprimés (`node-forge` à retirer)
- [x] `auth.config.ts` — seul `registerUser()` appelé à l'inscription (sans création wallet auto)
- [x] `CoinbaseCdpOnRampAdapter` — réseau mappé sur `base`
- [ ] **À FAIRE** — Prisma migrate : `npx prisma migrate dev --name migrate_base_user_controlled`
- [ ] **À FAIRE** — Token IDs USDC sur Base Sepolia / Base à configurer dans `.env`
- [ ] **À FAIRE** — `node-forge` à retirer (`back2/package.json`)

### Mobile
- [x] `CircleChallengeWebView` créé — Circle Web SDK via CDN dans WebView Modal
- [x] Flow d'inscription inclut setup PIN (register.tsx)
- [x] Flow de transfert inclut confirmation PIN (transfert.tsx)
- [x] `initiateWalletSetup()` / `confirmWalletSetup()` ajoutés au walletStore
- [x] `transfer()` retourne `TransferResponse` (challenge) au lieu de l'ID seul
- [x] Types `WalletSetupChallenge`, `WalletSetupConfirm`, `TransferResponse` ajoutés à `api/types.ts`

### Base de données
- [x] Schema Prisma mis à jour — `BASE_SEPOLIA` default, `walletSetId` optionnel, `challengeId` sur Transaction
- [ ] **À FAIRE** — Migration Prisma à appliquer : `npx prisma migrate reset` (dev)

### Infrastructure
- [ ] **À FAIRE** — Variables d'env à mettre à jour :
  ```env
  CIRCLE_APP_ID=<app-id-user-controlled>
  USDC_TOKEN_ID_BASE_SEPOLIA=<token-id>
  USDC_TOKEN_ID_BASE=<token-id>
  DEFAULT_BLOCKCHAIN=BASE_SEPOLIA
  # Supprimer: CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_SET_ID, CIRCLE_RSA_PUBLIC_KEY
  ```
- [ ] **À FAIRE** — Circle Dashboard : créer app User-Controlled, activer Base Sepolia / Base
- [ ] **À FAIRE** — Webhooks Circle configurés pour les événements de challenge

---

## Risques & considérations

### 1. Disponibilité du SDK React Native Circle
**✅ Résolu** — Circle ne propose pas de SDK React Native natif. Solution retenue : Circle Web SDK (`@circle-fin/w3s-pw-web-sdk`) chargé depuis CDN dans une WebView modale (`CircleChallengeWebView`). Les résultats transitent via `window.ReactNativeWebView.postMessage()`.

### 2. UX dégradée vs Developer-Controlled
Chaque transaction nécessite une saisie de PIN. C'est le trade-off de la self-custody. Atténuation possible : PIN biométrique (Face ID / empreinte) via le SDK Circle.

### 3. Perte du PIN utilisateur
En User-Controlled, si l'utilisateur perd son PIN et n'a pas de moyen de récupération, il perd l'accès à son wallet. Circle propose des mécanismes de recovery questions à implémenter.

### 4. Onramp Coinbase sur Base
Vérifier que Coinbase CDP supporte Base Sepolia pour les tests. Si ce n'est pas le cas, les tests de dépôt/retrait seront limités.

### 5. Changement de réseau = nouveaux gas fees
Base utilise ETH pour les gas fees (L2 optimiste sur Ethereum). Les estimations de frais changent — mettre à jour `estimateFee()` dans l'adapter.

### 6. Suppression de `node-forge`
Si `node-forge` est utilisé uniquement pour l'Entity Secret, il peut être supprimé. Vérifier qu'il n'est pas utilisé ailleurs dans le code.

---

## Ordre d'implémentation recommandé

```
Semaine 1 : Réseau Base
  1. Configurer Circle Dashboard (User-Controlled App + Base)
  2. Mettre à jour config et variables d'env
  3. Mettre à jour CircleWalletAdapter (réseau + token IDs)
  4. Migration Prisma
  5. Tester les wallets sur Base Sepolia

Semaine 2 : User-Controlled Backend
  6. Réécrire CircleWalletAdapter (méthodes user-controlled)
  7. Modifier CreateWalletHandler
  8. Modifier ExecuteTransferHandler
  9. Ajouter endpoints (user-token, setup, challenge)
  10. Ajouter challenge-poll.worker

Semaine 3 : Mobile User-Controlled
  11. Intégrer Circle SDK mobile (ou WebView)
  12. Modifier flow d'inscription (setup PIN)
  13. Modifier flow de transfert (confirmation PIN)
  14. Créer circle-challenge-modal
  15. Tests end-to-end
```
