# 🖥️ Boutique Informatique & SAV

Application professionnelle de gestion pour magasins de vente de matériel informatique, pièces détachées et atelier de réparation SAV.

---

## 🚀 Fonctionnalités Principales

### 1. 🖥️ Inventaire & Pièces Informatiques
- Gestion des composants : Processeurs (CPU), Mémoire (RAM), Cartes graphiques (GPU), Disques (SSD NVMe, HDD), Cartes mères, Boîtiers, Écrans, Périphériques, etc.
- Suivi en temps réel des stocks avec calcul automatique du statut : **En stock**, **Stock faible** (seuil d'alerte), **Rupture**.
- Prix d'achat, prix de vente et calcul de la marge.
- Recherche instantanée, filtrage par catégorie et tri multicritère.

### 2. 🔧 Atelier SAV & Pièces en attente de réparation
- **Tickets d'intervention SAV** avec attribution de N° de ticket unique (`SAV-YYYY-XXXX`).
- Fiche client complète : nom, téléphone, diagnostic, appareil (marque, modèle, N° de série).
- **Statut dédié pour le SAV :**
  - `Reçu`
  - `En diagnostic`
  - **`En attente de pièce`** (avec signalétique visuelle pour identifier les réparations bloquées)
  - `En cours de réparation`
  - `Terminé`
  - `Livré au client`
  - `Annulé`
- Niveaux de priorité (Basse, Normale, Haute, Urgente).
- Coûts estimés et coûts réels avec attribution du technicien en charge.

### 3. 📦 Pièces à commander & Réapprovisionnement
- Gestion des bons de commande fournisseurs (`CMD-YYYY-XXXX`).
- Détection des articles en rupture et en stock faible nécessitant une commande.
- Lignes d'articles détaillées (quantités commandées vs reçues, prix d'achat, montants totaux).
- Suivi du statut de commande : *Brouillon, Envoyée, Confirmée, En transit, Reçue partielle, Reçue*.

### 4. 💳 Caisse & Vente Directe (POS)
- Terminal de caisse rapide : sélection en un clic des pièces disponibles en rayon.
- Gestion du panier d'achat, quantités, remises par article ou remise globale.
- Modes de règlement : Espèces, Carte bancaire, Virement, Chèque.
- **Décrémentation automatique du stock** lors de la validation d'une vente.
- Ticket de caisse / facture imprimable en un clic.

### 5. 👥 Clients & 🚚 Fournisseurs Grossistes
- Fiches clients particuliers et entreprises avec historique d'achats cumulé.
- Fiches fournisseurs (grossistes IT) avec délais de livraison moyens et conditions commerciales.

### 6. 📊 Tableau de Bord & Indicateurs KPIs
- Ventes du jour et ventes du mois en DZD.
- Nombre de réparations actives et pièces en attente.
- Alertes de réapprovisionnement et graphiques de répartition du stock par composant.
- Mode clair / Mode sombre (Dark mode).

---

## 🛠️ Lancement & Utilisation

### Mode Web (Navigateur)
```bash
npm run dev
```
Accessible sur `http://localhost:8080`

### Mode Bureau (Electron)
```bash
npm run electron:dev
```

### Compiler pour Windows (.exe)
```bash
npm run electron:build
```
Le fichier exécutable d'installation est généré dans le dossier `release/`.

---

## 💻 Stack Technique
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** + **Radix UI**
- **Lucide Icons**
- **Recharts** (Visualisation des graphiques)
- **Electron** (Application Desktop autonome)
