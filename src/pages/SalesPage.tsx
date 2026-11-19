import { useState, useMemo } from "react";
import {
  Receipt, Plus, Search, ShoppingBag, Trash2, Printer, Check,
  CreditCard, Banknote, Building2, User, Eye, X, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { saleStorage, stockStorage, clientStorage } from "@/lib/storage";
import { formatPrice, formatDateTime, formatDate, generateId, cn } from "@/lib/utils";
import type { Sale, SaleLine, PaymentMethod } from "@/types";
import { toast } from "sonner";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(() => saleStorage.getAll());
  const [stockItems, setStockItems] = useState(() => stockStorage.getAll());
  const [clients, setClients] = useState(() => clientStorage.getAll());

  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"history" | "new">("new");

  // New sale state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [cart, setCart] = useState<SaleLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("espèces");
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [montantVerse, setMontantVerse] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Product selector in POS
  const [productSearch, setProductSearch] = useState("");

  // View sale modal
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const refreshData = () => {
    setSales(saleStorage.getAll());
    setStockItems(stockStorage.getAll());
    setClients(clientStorage.getAll());
  };

  // Stock available for sale
  const filteredStock = useMemo(() => {
    if (!productSearch) return stockItems.filter(s => s.quantite > 0).slice(0, 8);
    const q = productSearch.toLowerCase();
    return stockItems.filter(s =>
      s.quantite > 0 &&
      (s.nom.toLowerCase().includes(q) ||
        s.reference.toLowerCase().includes(q) ||
        s.marque.toLowerCase().includes(q) ||
        s.categorie.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [stockItems, productSearch]);

  const addToCart = (stockItem: typeof stockItems[0]) => {
    const existingIndex = cart.findIndex(l => l.stockItemId === stockItem.id);
    if (existingIndex > -1) {
      if (cart[existingIndex].quantite >= stockItem.quantite) {
        toast.error(`Stock maximal atteint pour ${stockItem.nom} (${stockItem.quantite} dispo)`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantite += 1;
      updated[existingIndex].total = (updated[existingIndex].quantite * updated[existingIndex].prixUnitaire) - updated[existingIndex].remise;
      setCart(updated);
    } else {
      setCart(prev => [
        ...prev,
        {
          id: generateId(),
          stockItemId: stockItem.id,
          reference: stockItem.reference,
          designation: stockItem.nom,
          quantite: 1,
          prixUnitaire: stockItem.prixVente,
          remise: 0,
          total: stockItem.prixVente,
        }
      ]);
    }
  };

  const updateCartQty = (id: string, qty: number) => {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    const stock = stockItems.find(s => s.id === item.stockItemId);
    const maxQty = stock ? stock.quantite : 999;

    if (qty > maxQty) {
      toast.error(`Quantité limitée au stock disponible (${maxQty})`);
      qty = maxQty;
    }

    if (qty <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(prev => prev.map(l => {
      if (l.id !== id) return l;
      return {
        ...l,
        quantite: qty,
        total: (qty * l.prixUnitaire) - l.remise,
      };
    }));
  };

  const updateCartDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(l => {
      if (l.id !== id) return l;
      return {
        ...l,
        remise: discount,
        total: (l.quantite * l.prixUnitaire) - discount,
      };
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(l => l.id !== id));
  };

  const cartSubtotal = cart.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  const cartLineDiscounts = cart.reduce((sum, l) => sum + l.remise, 0);
  const cartTotal = Math.max(0, cartSubtotal - cartLineDiscounts - globalDiscount);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    const selectedClient = clients.find(c => c.id === selectedClientId);
    const payeNum = montantVerse !== "" ? Number(montantVerse) : cartTotal;
    const resteNum = Math.max(0, cartTotal - payeNum);

    // Save sale
    const newSale = saleStorage.add({
      clientId: selectedClient?.id,
      clientNom: selectedClient ? `${selectedClient.nom} ${selectedClient.prenom || ""}`.trim() : "Client Comptoir",
      lignes: cart,
      sousTotal: cartSubtotal,
      remiseGlobale: globalDiscount + cartLineDiscounts,
      montantTotal: cartTotal,
      montantPaye: payeNum,
      resteAPayer: resteNum,
      methodePaiement: paymentMethod,
      vendeur: "Responsable Caisse",
      notes: notes || undefined,
      facture: true,
    });

    // Decrement stock for each item
    cart.forEach(line => {
      stockStorage.decrementQuantite(line.stockItemId, line.quantite);
    });

    // Update client total purchases if selected
    if (selectedClient) {
      clientStorage.update(selectedClient.id, {
        totalAchats: (selectedClient.totalAchats || 0) + cartTotal,
      });
    }

    toast.success(`Vente enregistrée avec succès ! (Réf: ${newSale.numeroVente})`);

    // Reset checkout form
    setCart([]);
    setSelectedClientId("");
    setGlobalDiscount(0);
    setMontantVerse("");
    setNotes("");
    refreshData();
    setViewSale(newSale);
  };

  // Filtered sales history
  const filteredSales = useMemo(() => {
    return sales
      .filter(s => {
        const q = search.toLowerCase();
        return (
          s.numeroVente.toLowerCase().includes(q) ||
          (s.clientNom && s.clientNom.toLowerCase().includes(q))
        );
      })
      .filter(s => filterPayment === "all" || s.methodePaiement === filterPayment)
      .sort((a, b) => new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime());
  }, [sales, search, filterPayment]);

  const totalVentes = sales.reduce((acc, s) => acc + s.montantTotal, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" /> Ventes & Caisse
          </h1>
          <p className="page-subtitle">Terminal point de vente informatique et historique des factures</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "new" ? "default" : "outline"}
            onClick={() => setActiveTab("new")}
            className="gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Nouvelle vente (Caisse)
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="gap-2"
          >
            <Receipt className="w-4 h-4" /> Historique ({sales.length})
          </Button>
        </div>
      </div>

      {activeTab === "new" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Product Selection */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Scanner ou rechercher une pièce informatique (CPU, RAM, SSD, GPU, Écran...)"
                  className="pl-9"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3 flex items-center justify-between">
                <span>Catalogue disponible en rayon</span>
                <span>{filteredStock.length} article(s)</span>
              </div>

              {filteredStock.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Aucun article trouvé ou stock épuisé
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                  {filteredStock.map(item => (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="border border-border/80 rounded-lg p-3 hover:border-primary hover:bg-muted/30 transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {item.reference}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 font-medium rounded-full">
                            {item.quantite} en stock
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {item.nom}
                        </h4>
                        <p className="text-xs text-muted-foreground">{item.marque} · {item.categorie}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                        <span className="font-bold text-base text-foreground">
                          {formatPrice(item.prixVente)}
                        </span>
                        <Button size="sm" variant="secondary" className="h-7 text-xs px-2.5 gap-1 group-hover:bg-primary group-hover:text-primary-foreground">
                          <Plus className="w-3.5 h-3.5" /> Ajouter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cart & Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col h-full">
              <h3 className="font-semibold text-base mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Panier en cours
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {cart.reduce((s, l) => s + l.quantite, 0)} pièce(s)
                </span>
              </h3>

              {/* Client Selection */}
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-1 block">Client (Optionnel)</Label>
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="">Client Comptoir / Vente directe</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom || ""} {c.entreprise ? `(${c.entreprise})` : ""} - {c.telephone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2.5 mb-4 border-y border-border py-3">
                {cart.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    Votre panier est vide.<br />Sélectionnez des articles à gauche.
                  </div>
                ) : (
                  cart.map(line => (
                    <div key={line.id} className="bg-muted/30 rounded-lg p-2.5 flex items-center justify-between gap-2 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{line.designation}</p>
                        <p className="text-[11px] text-muted-foreground">{formatPrice(line.prixUnitaire)} / unité</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="1"
                          className="h-7 w-14 text-xs text-center"
                          value={line.quantite}
                          onChange={e => updateCartQty(line.id, parseInt(e.target.value) || 1)}
                        />
                        <span className="font-semibold text-xs min-w-[70px] text-right">
                          {formatPrice(line.total)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(line.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Details */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Mode de règlement</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["espèces", "carte", "virement"] as PaymentMethod[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={cn(
                          "py-1.5 text-xs font-medium rounded-lg border text-center capitalize transition-colors",
                          paymentMethod === mode
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 hover:bg-muted text-foreground border-border"
                        )}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Remise globale (DT)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-xs"
                      value={globalDiscount || ""}
                      onChange={e => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Remarque</Label>
                    <Input
                      className="h-8 text-xs"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="N° chèque, bon..."
                    />
                  </div>
                </div>

                {/* Paiement / Avance */}
                <div className="bg-blue-50/60 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      Montant Versé / Avance (DT)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setMontantVerse(cartTotal.toString())}
                      className="text-[11px] text-emerald-600 font-bold hover:underline"
                    >
                      ✓ Tout payer ({formatPrice(cartTotal)})
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-xs font-mono bg-white dark:bg-card"
                    placeholder={`Total : ${formatPrice(cartTotal)}`}
                    value={montantVerse}
                    onChange={e => setMontantVerse(e.target.value)}
                  />
                  {montantVerse !== "" && Number(montantVerse) < cartTotal && (
                    <div className="flex justify-between font-bold text-amber-700 dark:text-amber-400 pt-1">
                      <span>Reste à payer (Crédit) :</span>
                      <span>{formatPrice(Math.max(0, cartTotal - Number(montantVerse)))}</span>
                    </div>
                  )}
                </div>

                {/* Summary calculation */}
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sous-total:</span>
                    <span>{formatPrice(cartSubtotal)}</span>
                  </div>
                  {(cartLineDiscounts + globalDiscount) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Remise totale:</span>
                      <span>-{formatPrice(cartLineDiscounts + globalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
                    <span>Net à payer:</span>
                    <span className="text-primary">{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                {/* Checkout button */}
                <Button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full gap-2 h-11 text-base font-semibold shadow-md"
                >
                  <Check className="w-5 h-5" /> Encaisser & Valider
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° de vente, nom client..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background w-44"
            >
              <option value="all">Tous les règlements</option>
              <option value="espèces">Espèces</option>
              <option value="carte">Carte bancaire</option>
              <option value="virement">Virement</option>
              <option value="chèque">Chèque</option>
            </select>
          </div>

          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">N° Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date & Heure</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Articles</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Paiement</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Montant Total</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        Aucune vente trouvée
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{sale.numeroVente}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(sale.dateVente)}</td>
                        <td className="px-4 py-3 font-medium">{sale.clientNom || "Client Comptoir"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {sale.lignes.length} réf ({sale.lignes.reduce((s, l) => s + l.quantite, 0)} pcs)
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-xs bg-muted px-2 py-0.5 rounded border border-border">
                            {sale.methodePaiement}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {formatPrice(sale.montantTotal)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => setViewSale(sale)}
                          >
                            <Eye className="w-3.5 h-3.5" /> Voir facture
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice / Ticket Dialog */}
      <Dialog open={!!viewSale} onOpenChange={open => !open && setViewSale(null)}>
        <DialogContent className="max-w-lg">
          {viewSale && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <img src="./logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                  <h2 className="text-xl font-bold tracking-tight">Boutique Informatique & SAV</h2>
                </div>
                <p className="text-xs text-muted-foreground">Vente de matériel informatique, pièces détachées & SAV</p>
                <p className="text-xs text-muted-foreground mt-1">Ticket N°: <span className="font-mono font-bold text-foreground">{viewSale.numeroVente}</span></p>
                <p className="text-xs text-muted-foreground">{formatDateTime(viewSale.dateVente)}</p>
              </div>

              <div className="text-xs space-y-1 bg-muted/30 p-2.5 rounded">
                <p><span className="text-muted-foreground">Client:</span> <span className="font-semibold">{viewSale.clientNom || "Client Comptoir"}</span></p>
                <p><span className="text-muted-foreground">Règlement:</span> <span className="capitalize">{viewSale.methodePaiement}</span></p>
              </div>

              <div className="border rounded-lg overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Désignation</th>
                      <th className="px-2 py-1.5 text-center">Qté</th>
                      <th className="px-3 py-1.5 text-right">P.U</th>
                      <th className="px-3 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewSale.lignes.map(l => (
                      <tr key={l.id} className="border-t border-border">
                        <td className="px-3 py-1.5 font-medium">{l.designation}</td>
                        <td className="px-2 py-1.5 text-center">{l.quantite}</td>
                        <td className="px-3 py-1.5 text-right">{formatPrice(l.prixUnitaire)}</td>
                        <td className="px-3 py-1.5 text-right font-semibold">{formatPrice(l.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total:</span>
                  <span>{formatPrice(viewSale.sousTotal)}</span>
                </div>
                {viewSale.remiseGlobale > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Remise:</span>
                    <span>-{formatPrice(viewSale.remiseGlobale)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-1 border-t">
                  <span>TOTAL:</span>
                  <span className="text-primary">{formatPrice(viewSale.montantTotal)}</span>
                </div>
                {viewSale.montantPaye !== undefined && (
                  <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 font-semibold pt-1 border-t border-dashed">
                    <span>Avance / Montant Versé:</span>
                    <span>{formatPrice(viewSale.montantPaye)}</span>
                  </div>
                )}
                {viewSale.resteAPayer !== undefined && viewSale.resteAPayer > 0 && (
                  <div className="flex justify-between text-xs text-amber-700 dark:text-amber-400 font-bold">
                    <span>Reste à payer (Crédit):</span>
                    <span>{formatPrice(viewSale.resteAPayer)}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-4 h-4" /> Imprimer Ticket
                </Button>
                <Button size="sm" onClick={() => setViewSale(null)}>Fermer</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

