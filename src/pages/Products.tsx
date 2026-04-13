import { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Product } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const emptyProduct = (): Product => ({
  id: crypto.randomUUID(),
  name: '',
  reference: '',
  category: '',
  price: 0,
  costPrice: 0,
  quantity: 0,
  minStock: 5,
  unit: 'pcs',
  createdAt: new Date().toISOString(),
});

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Product>(emptyProduct());

  useEffect(() => { setProducts(store.getProducts()); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.name || !form.reference) {
      toast.error('Nom et référence requis');
      return;
    }
    if (editing) {
      store.updateProduct(form);
      toast.success('Produit modifié');
    } else {
      store.addProduct(form);
      toast.success('Produit ajouté');
    }
    setProducts(store.getProducts());
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyProduct());
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    store.deleteProduct(id);
    setProducts(store.getProducts());
    toast.success('Produit supprimé');
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyProduct());
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Produits</h1>
          <p className="text-muted-foreground mt-1">{products.length} produits en stock</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-2" /> Nouveau Produit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Modifier' : 'Ajouter'} un produit</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nom du produit" />
              </div>
              <div>
                <Label>Référence *</Label>
                <Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="REF-001" />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Électronique" />
              </div>
              <div>
                <Label>Prix de vente</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
              </div>
              <div>
                <Label>Prix d'achat</Label>
                <Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: +e.target.value })} />
              </div>
              <div>
                <Label>Quantité initiale</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
              </div>
              <div>
                <Label>Stock minimum</Label>
                <Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: +e.target.value })} />
              </div>
              <div>
                <Label>Unité</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pcs, kg, m" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {editing ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Rechercher par nom, référence ou catégorie..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-40" />
              <p>Aucun produit trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-card hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between py-4 px-6">
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 items-center">
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.reference}</p>
                    </div>
                    <p className="text-xs text-muted-foreground hidden md:block">{p.category || '-'}</p>
                    <p className="text-sm font-medium hidden md:block">{p.price.toLocaleString('fr-FR')} TND</p>
                    <div className={`text-sm font-bold ${p.quantity <= p.minStock ? 'text-warning' : 'text-success'}`}>
                      {p.quantity} {p.unit}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
