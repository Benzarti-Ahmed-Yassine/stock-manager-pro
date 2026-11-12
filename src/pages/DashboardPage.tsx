import {
  Package, Wrench, ShoppingCart, AlertTriangle,
  TrendingUp, Users, Receipt, AlertCircle
} from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { stockStorage, repairStorage, orderStorage, saleStorage, clientStorage } from "@/lib/storage";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getRepairStatusLabel(status: string): string {
  const map: Record<string, string> = {
    reçu: "Reçu", en_diagnostic: "Diagnostic", en_attente_pièce: "Attente pièce",
    en_cours: "En cours", terminé: "Terminé", livré: "Livré", annulé: "Annulé",
  };
  return map[status] || status;
}

export default function DashboardPage() {
  const stock = stockStorage.getAll();
  const repairs = repairStorage.getAll();
  const orders = orderStorage.getAll();
  const sales = saleStorage.getAll();
  const clients = clientStorage.getAll();

  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const stockFaible = stock.filter(s => s.status === "stock_faible").length;
    const enRupture = stock.filter(s => s.status === "rupture").length;
    const stockValeur = stock.reduce((acc, s) => acc + s.prixAchat * s.quantite, 0);

    const reparationsActives = repairs.filter(r =>
      ["reçu", "en_diagnostic", "en_attente_pièce", "en_cours"].includes(r.status)
    ).length;
    const reparationsEnAttente = repairs.filter(r => r.status === "en_attente_pièce").length;

    const commandesEnCours = orders.filter(o =>
      ["envoyée", "confirmée", "en_transit", "reçue_partielle"].includes(o.status)
    ).length;

    const ventesJour = sales.filter(s => new Date(s.dateVente).toDateString() === today);
    const ventesMois = sales.filter(s => {
      const d = new Date(s.dateVente);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    return {
      stockTotal: stock.length,
      stockFaible, enRupture, stockValeur,
      reparationsActives, reparationsEnAttente,
      commandesEnCours,
      ventesJour: ventesJour.length,
      ventesJourMontant: ventesJour.reduce((a, s) => a + s.montantTotal, 0),
      ventesMois: ventesMois.length,
      ventesMoisMontant: ventesMois.reduce((a, s) => a + s.montantTotal, 0),
      clientsTotal: clients.length,
    };
  }, [stock, repairs, orders, sales, clients]);

  // Chart: ventes par catégorie stock
  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    stock.forEach(s => {
      cats[s.categorie] = (cats[s.categorie] || 0) + s.quantite;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));
  }, [stock]);

  // Réparations récentes
  const recentRepairs = repairs
    .sort((a, b) => new Date(b.dateReception).getTime() - new Date(a.dateReception).getTime())
    .slice(0, 5);

  // Stocks faibles / rupture
  const alertStock = stock
    .filter(s => s.status !== "en_stock")
    .sort((a, b) => a.quantite - b.quantite)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble de votre boutique informatique</p>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventes du jour"
          value={formatPrice(stats.ventesJourMontant)}
          subtitle={`${stats.ventesJour} transaction(s)`}
          icon={Receipt}
          color="blue"
          trend={{ value: 12, label: "vs hier" }}
        />
        <StatCard
          title="Ventes du mois"
          value={formatPrice(stats.ventesMoisMontant)}
          subtitle={`${stats.ventesMois} vente(s)`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Réparations actives"
          value={stats.reparationsActives}
          subtitle={`${stats.reparationsEnAttente} en attente pièce`}
          icon={Wrench}
          color="purple"
        />
        <StatCard
          title="Commandes en cours"
          value={stats.commandesEnCours}
          subtitle="Fournisseurs"
          icon={ShoppingCart}
          color="cyan"
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Articles en stock"
          value={stats.stockTotal}
          subtitle={`Valeur: ${formatPrice(stats.stockValeur)}`}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Stock faible"
          value={stats.stockFaible}
          subtitle="Sous le seuil d'alerte"
          icon={AlertTriangle}
          color="yellow"
        />
        <StatCard
          title="Rupture de stock"
          value={stats.enRupture}
          subtitle="Articles épuisés"
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="Clients"
          value={stats.clientsTotal}
          subtitle="Clients enregistrés"
          icon={Users}
          color="green"
        />
      </div>

      {/* Charts + Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock par catégorie */}
        <div className="table-container p-5">
          <h3 className="font-semibold text-sm mb-4">Stock par catégorie</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Qté" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes stock */}
        <div className="table-container p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Alertes de stock</h3>
            <a href="/stock" className="text-xs text-primary hover:underline">Voir tout →</a>
          </div>
          {alertStock.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">✅ Aucune alerte de stock</p>
          ) : (
            <div className="space-y-2">
              {alertStock.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nom}</p>
                    <p className="text-xs text-muted-foreground">{item.marque} · {item.categorie}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-bold">
                      {item.quantite}
                    </span>
                    <span
                      className={cn(
                        "badge-status text-xs",
                        item.status === "rupture" ? "status-rupture" : "status-stock_faible"
                      )}
                    >
                      {item.status === "rupture" ? "Rupture" : "Faible"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Repairs */}
      <div className="table-container p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Réparations récentes (SAV)</h3>
          <a href="/reparations" className="text-xs text-primary hover:underline">Voir tout →</a>
        </div>
        {recentRepairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune réparation en cours</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Ticket</th>
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Client</th>
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Appareil</th>
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Statut</th>
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Priorité</th>
                  <th className="text-left pb-2 text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRepairs.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-primary font-medium">{r.numeroTicket}</td>
                    <td className="py-2.5">{r.clientNom}</td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-32">{r.appareil}</td>
                    <td className="py-2.5">
                      <span className={cn("badge-status", `status-${r.status}`)}>
                        {getRepairStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={cn("badge-status", `priority-${r.priorite}`)}>
                        {r.priorite}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(r.dateReception)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

