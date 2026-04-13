import { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Product, Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingDown, TrendingUp, AlertTriangle, ArrowDownUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setProducts(store.getProducts());
    setTransactions(store.getTransactions());
  }, []);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);
    const lowStock = products.filter(p => p.quantity <= p.minStock).length;
    const todayTx = transactions.filter(t => t.date.startsWith(new Date().toISOString().slice(0, 10))).length;
    return { totalProducts, totalValue, lowStock, todayTx };
  }, [products, transactions]);

  const recentTx = transactions.slice(-5).reverse();
  const lowStockProducts = products.filter(p => p.quantity <= p.minStock).slice(0, 5);

  const statCards = [
    { title: 'Total Produits', value: stats.totalProducts, icon: Package, color: 'text-info' },
    { title: 'Valeur Stock', value: `${stats.totalValue.toLocaleString('fr-FR')} TND`, icon: TrendingUp, color: 'text-success' },
    { title: 'Stock Faible', value: stats.lowStock, icon: AlertTriangle, color: 'text-warning' },
    { title: "Mouvements Aujourd'hui", value: stats.todayTx, icon: ArrowDownUp, color: 'text-accent' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre stock</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertes Stock Faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune alerte</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Réf: {p.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-warning">{p.quantity} {p.unit}</p>
                      <p className="text-xs text-muted-foreground">Min: {p.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-accent" />
              Derniers Mouvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun mouvement</p>
            ) : (
              <div className="space-y-3">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {tx.type === 'entry' ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tx.productName}</p>
                          <span className="text-[10px] text-muted-foreground bg-muted-foreground/10 px-1 rounded">{format(new Date(tx.date), "HH:mm")}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{tx.clientName || 'Stock interne'}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${tx.type === 'entry' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'entry' ? '+' : '-'}{tx.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
