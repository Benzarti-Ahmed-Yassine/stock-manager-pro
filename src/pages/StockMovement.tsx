import { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Product, Client, Transaction, CLIENT_CATEGORY_LABELS, ClientCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownUp, TrendingUp, TrendingDown, Search, Trash2, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
  LineChart, Line,
} from 'recharts';

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Color palette for bar chart
const BAR_COLORS = [
  'hsl(142, 71%, 45%)',   // emerald
  'hsl(217, 91%, 60%)',   // blue
  'hsl(262, 83%, 58%)',   // violet
  'hsl(25, 95%, 53%)',    // orange
  'hsl(338, 80%, 55%)',   // rose
  'hsl(173, 80%, 40%)',   // teal
  'hsl(47, 96%, 53%)',    // amber
  'hsl(291, 64%, 42%)',   // purple
];

export default function StockMovement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [type, setType] = useState<'entry' | 'exit'>('entry');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientCategory, setClientCategory] = useState<ClientCategory>('comptoir');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  useEffect(() => {
    setProducts(store.getProducts());
    setClients(store.getClients());
    setTransactions(store.getTransactions());
  }, []);

  const filteredProducts = useMemo(() =>
    productSearch.length > 0
      ? products.filter(p =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.reference.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 8)
      : [],
    [productSearch, products]
  );

  const filteredClients = useMemo(() =>
    clientSearch.length > 0
      ? clients.filter(c =>
          c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          (c.company && c.company.toLowerCase().includes(clientSearch.toLowerCase()))
        ).slice(0, 8)
      : [],
    [clientSearch, clients]
  );

  // =====================================================
  // CHART DATA COMPUTATIONS
  // =====================================================

  // 1. Daily entries vs exits (last 30 days)
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const start = startOfDay(subDays(now, 29));
    const days = eachDayOfInterval({ start, end: now });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'dd/MM', { locale: fr });

      let entries = 0;
      let exits = 0;
      transactions.forEach(tx => {
        const txDay = format(new Date(tx.date), 'yyyy-MM-dd');
        if (txDay === dayStr) {
          if (tx.type === 'entry') entries += tx.quantity;
          else exits += tx.quantity;
        }
      });

      return { date: label, Entrées: entries, Sorties: exits };
    });
  }, [transactions]);

  // 2. Top products by exit quantity
  const topProductsData = useMemo(() => {
    const map = new Map<string, { name: string; qty: number }>();
    transactions.forEach(tx => {
      if (tx.type === 'exit') {
        const existing = map.get(tx.productId);
        if (existing) {
          existing.qty += tx.quantity;
        } else {
          map.set(tx.productId, { name: tx.productName, qty: tx.quantity });
        }
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8)
      .map(p => ({ name: p.name.length > 18 ? p.name.substring(0, 18) + '…' : p.name, Quantité: p.qty }));
  }, [transactions]);

  // 3. Daily sales rate (cumulative exits per day as a line)
  const salesRateData = useMemo(() => {
    const now = new Date();
    const start = startOfDay(subDays(now, 29));
    const days = eachDayOfInterval({ start, end: now });

    let cumulative = 0;
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const label = format(day, 'dd/MM', { locale: fr });

      let dailyExits = 0;
      transactions.forEach(tx => {
        if (tx.type === 'exit' && format(new Date(tx.date), 'yyyy-MM-dd') === dayStr) {
          dailyExits += tx.quantity;
        }
      });
      cumulative += dailyExits;

      return { date: label, 'Ventes du jour': dailyExits, 'Cumul ventes': cumulative };
    });
  }, [transactions]);

  // Summary stats
  const stats = useMemo(() => {
    const totalEntries = transactions.filter(t => t.type === 'entry').reduce((s, t) => s + t.quantity, 0);
    const totalExits = transactions.filter(t => t.type === 'exit').reduce((s, t) => s + t.quantity, 0);
    const uniqueProducts = new Set(transactions.filter(t => t.type === 'exit').map(t => t.productId)).size;
    return { totalEntries, totalExits, uniqueProducts };
  }, [transactions]);

  const handleSubmit = () => {
    if (!selectedProduct) { toast.error('Sélectionnez un produit'); return; }
    if (quantity <= 0) { toast.error('Quantité invalide'); return; }
    if (type === 'exit' && quantity > selectedProduct.quantity) {
      toast.error('Stock insuffisant'); return;
    }

    const tx: Transaction = {
      id: crypto.randomUUID(),
      type,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      clientId: selectedClient?.id,
      clientName: selectedClient?.name || (type === 'exit' && clientCategory === 'comptoir' ? 'Client Comptoir' : undefined),
      clientCategory: type === 'exit' ? clientCategory : undefined,
      note,
      date: new Date().toISOString(),
    };

    store.addTransaction(tx);
    setTransactions(store.getTransactions());
    setProducts(store.getProducts());
    
    toast.success(`${type === 'entry' ? 'Entrée' : 'Sortie'} de ${quantity} ${selectedProduct.unit} enregistrée`);
    
    setSelectedProduct(null);
    setProductSearch('');
    setSelectedClient(null);
    setClientSearch('');
    setQuantity(1);
    setNote('');
  };

  const recentTx = transactions.slice(-10).reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mouvement de Stock</h1>
          <p className="text-muted-foreground mt-1">Entrée et sortie de stock avec saisie automatique · {transactions.length} mouvements</p>
        </div>
        {transactions.length > 0 && (
          <Button
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              if (confirm('⚠️ Voulez-vous vraiment vider tout l\'historique des mouvements ?\n\nCette action est IRRÉVERSIBLE. Les quantités en stock ne seront PAS modifiées.')) {
                if (confirm('Confirmation finale : SUPPRIMER définitivement ' + transactions.length + ' enregistrements ?')) {
                  store.clearTransactions();
                  setTransactions([]);
                  toast.success('Historique des mouvements vidé avec succès');
                }
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Vider l'historique
          </Button>
        )}
      </div>

      {/* Summary Stats Cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="glass-card border-l-4 border-l-green-500">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Entrées</p>
                    <p className="text-2xl font-bold text-green-500">{stats.totalEntries.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="glass-card border-l-4 border-l-red-500">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sorties</p>
                    <p className="text-2xl font-bold text-red-500">{stats.totalExits.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="glass-card border-l-4 border-l-blue-500">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Produits Vendus</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.uniqueProducts}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500/30" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-accent" />
              Nouveau Mouvement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type */}
            <div className="flex gap-2">
              <Button
                variant={type === 'entry' ? 'default' : 'outline'}
                onClick={() => setType('entry')}
                className={type === 'entry' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
              >
                <TrendingUp className="h-4 w-4 mr-2" /> Entrée
              </Button>
              <Button
                variant={type === 'exit' ? 'default' : 'outline'}
                onClick={() => setType('exit')}
                className={type === 'exit' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                <TrendingDown className="h-4 w-4 mr-2" /> Sortie
              </Button>
            </div>

            {/* Product autocomplete */}
            <div className="relative">
              <Label>Produit *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Tapez pour rechercher un produit..."
                  value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.reference})` : productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value);
                    setSelectedProduct(null);
                    setShowProductSuggestions(true);
                  }}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 200)}
                />
              </div>
              {showProductSuggestions && filteredProducts.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      className="w-full text-left px-4 py-2 hover:bg-muted flex justify-between items-center text-sm"
                      onMouseDown={() => {
                        setSelectedProduct(p);
                        setProductSearch('');
                        setShowProductSuggestions(false);
                      }}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground text-xs">{p.reference} · {p.quantity} {p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client section for exits */}
            {type === 'exit' && (
              <>
                <div>
                  <Label>Catégorie Client</Label>
                  <Select value={clientCategory} onValueChange={v => setClientCategory(v as ClientCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLIENT_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {clientCategory !== 'comptoir' && (
                  <div className="relative">
                    <Label>{clientCategory === 'entreprise' ? 'Entreprise' : 'Client'}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        placeholder={`Rechercher ${clientCategory === 'entreprise' ? 'une entreprise' : 'un client'}...`}
                        value={selectedClient ? selectedClient.name : clientSearch}
                        onChange={e => {
                          setClientSearch(e.target.value);
                          setSelectedClient(null);
                          setShowClientSuggestions(true);
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                      />
                    </div>
                    {showClientSuggestions && filteredClients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filteredClients.map(c => (
                          <button
                            key={c.id}
                            className="w-full text-left px-4 py-2 hover:bg-muted flex justify-between items-center text-sm"
                            onMouseDown={() => {
                              setSelectedClient(c);
                              setClientSearch('');
                              setShowClientSuggestions(false);
                            }}
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{CLIENT_CATEGORY_LABELS[c.category]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantité *</Label>
                <Input type="number" min={1} value={quantity} onChange={e => setQuantity(+e.target.value)} />
              </div>
              <div>
                <Label>Note</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Optionnel" />
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Enregistrer le mouvement
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Historique récent</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun mouvement</p>
            ) : (
              <div className="space-y-2">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      {tx.type === 'entry' ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px]">{tx.productName}</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(tx.date), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}</span>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.type === 'entry' ? 'text-success' : 'text-destructive'}`}>
                      {tx.type === 'entry' ? '+' : '-'}{tx.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          CHARTS SECTION
          ===================================================== */}
      {transactions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Chart 1: Entries vs Exits over time */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-accent" />
                Courbe Entrées vs Sorties (30 derniers jours)
              </CardTitle>
              <p className="text-sm text-muted-foreground">Vision globale des flux de stock quotidiens</p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradEntries" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Entrées"
                      stroke="hsl(142, 71%, 45%)"
                      strokeWidth={2.5}
                      fill="url(#gradEntries)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Sorties"
                      stroke="hsl(0, 84%, 60%)"
                      strokeWidth={2.5}
                      fill="url(#gradExits)"
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Top products by sales */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  Top Produits Vendus
                </CardTitle>
                <p className="text-sm text-muted-foreground">Classement par quantité totale vendue</p>
              </CardHeader>
              <CardContent>
                {topProductsData.length === 0 ? (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                    Aucune sortie enregistrée
                  </div>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topProductsData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={130}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="Quantité" radius={[0, 6, 6, 0]} barSize={22}>
                          {topProductsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 3: Sales rate (daily + cumulative) */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Taux de Ventes
                </CardTitle>
                <p className="text-sm text-muted-foreground">Volume de ventes journalier et cumul sur 30 jours</p>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesRateData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradCumul" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="hsl(262, 83%, 58%)" />
                          <stop offset="100%" stopColor="hsl(217, 91%, 60%)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar
                        yAxisId="left"
                        dataKey="Ventes du jour"
                        fill="hsl(25, 95%, 53%)"
                        radius={[4, 4, 0, 0]}
                        barSize={14}
                        opacity={0.7}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Cumul ventes"
                        stroke="url(#gradCumul)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 5, fill: 'hsl(262, 83%, 58%)', strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}

