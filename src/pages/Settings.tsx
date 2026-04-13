import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { store } from "@/lib/store";
import { Download, Upload, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, FileJson, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    try {
      const data = store.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `SOBRATECH_Sauvegarde_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Sauvegarde exportée avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'exportation");
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ ATTENTION : L'importation de ces données va ÉCRASER toutes vos données actuelles. Cette action est irréversible. Voulez-vous continuer ?")) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setIsImporting(true);
      
      setTimeout(() => {
        const success = store.importAllData(content);
        if (success) {
          toast.success("Données restaurées avec succès ! L'application va redémarrer.");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error("Échec de l'importation. Le fichier est peut-être corrompu.");
          setIsImporting(false);
        }
      }, 1000);
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm("🚨 RÉINITIALISATION TOTALE : Voulez-vous vraiment supprimer TOUTES les données (produits, clients, BL, fiches) ?") &&
        confirm("CONFIRMATION FINALE : Tapez 'OUI' pour confirmer la suppression définitive.")) {
      store.resetAllData();
      toast.warning("Application réinitialisée.");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Paramètres de Sauvegarde</h1>
        <p className="text-muted-foreground">
          Gérez la sécurité de vos données SOBRATECH. Nous vous recommandons d'exporter votre base de données régulièrement.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card h-full border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Sauvegarder
              </CardTitle>
              <CardDescription>
                Téléchargez l'intégralité de votre base de données au format JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg flex items-start gap-3">
                <FileJson className="h-8 w-8 text-muted-foreground shrink-0 mt-1" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Format : JSON</p>
                  <p className="text-muted-foreground">Taille estimée : &lt; 2 Mo</p>
                  <p className="text-muted-foreground italic">Inclut : Produits, Clients, Fiches, BL et Mouvements.</p>
                </div>
              </div>
              <Button onClick={handleExport} className="w-full bg-primary hover:bg-primary/90">
                Lancer l'exportation
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Import Card */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card h-full border-t-4 border-t-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-amber-500" />
                Restaurer
              </CardTitle>
              <CardDescription>
                Récupérez vos données à partir d'un fichier de sauvegarde précédemment exporté.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center gap-3 group-hover:bg-muted/50 transition-colors">
                  {isImporting ? (
                    <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
                  ) : (
                    <FileJson className="h-10 w-10 text-amber-500/50 group-hover:text-amber-500 transition-colors" />
                  )}
                  <div className="text-center">
                    <p className="text-sm font-medium">Cliquez ou déposez votre fichier .json</p>
                    <p className="text-xs text-muted-foreground mt-1">Écrasera les données actuelles</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security & Info Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="md:col-span-2">
          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Zone de Danger
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Réinitialisation de l'application</p>
                <p className="text-xs text-muted-foreground">
                  Cette action effacera TOUTES les données de manière définitive. Assurez-vous d'avoir une sauvegarde.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleReset}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Effacer tout
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-muted/20 p-6 rounded-2xl flex gap-4 border border-border/50">
        <CheckCircle2 className="h-12 w-12 text-success shrink-0" />
        <div className="space-y-2">
          <h3 className="font-bold">Bonnes pratiques de sauvegarde</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
            <li>Exportez vos données à la fin de chaque journée de travail.</li>
            <li>Stockez vos fichiers JSON sur un support externe (Clé USB, Cloud).</li>
            <li>Renommez vos fichiers si nécessaire, mais conservez l'extension .json.</li>
            <li>Utilisez la restauration uniquement si vos données actuelles sont perdues ou corrompues.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
