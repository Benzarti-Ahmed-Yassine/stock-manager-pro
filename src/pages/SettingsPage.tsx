import { useState, useEffect } from "react";
import {
  Settings, Save, Download, Upload, RefreshCw, Shield,
  HardDrive, Bell, Store, AlertTriangle, Trash2, CheckCircle2,
  FolderOpen, FileText, Check, Copy, FileSpreadsheet, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { settingsStorage, exportAllData, importAllData, triggerFilePersistence, clearAllData } from "@/lib/storage";
import { downloadExcelFile } from "@/lib/excel";
import type { AppSettings } from "@/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => settingsStorage.get());
  const [saved, setSaved] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [networkPath, setNetworkPath] = useState("");

  useEffect(() => {
    if (window.electronAPI?.getStorageInfo) {
      window.electronAPI.getStorageInfo().then(info => {
        setStorageInfo(info);
        if (info.config?.dataPath) {
          setNetworkPath(info.config.dataPath);
        }
      });
    }
  }, []);

  const handleSave = async () => {
    settingsStorage.save(settings);

    if (window.electronAPI?.setStorageConfig && networkPath) {
      await window.electronAPI.setStorageConfig({
        dataPath: networkPath,
        backupCount: settings.backupCount,
      });
    }

    triggerFilePersistence();
    setSaved(true);
    toast.success("Paramètres enregistrés et données synchronisées !");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boutique_sav_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Données exportées avec succès !");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const ok = importAllData(text);
        if (ok) {
          triggerFilePersistence();
          toast.success("Données importées ! Rafraîchissez l'application.");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error("Fichier invalide ou corrompu");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleSyncNow = async () => {
    triggerFilePersistence();
    if (window.electronAPI?.getStorageInfo) {
      const info = await window.electronAPI.getStorageInfo();
      setStorageInfo(info);
    }
    toast.success("Synchronisation du fichier et réplication effectuée !");
  };

  const handleResetDemoData = () => {
    if (!window.confirm("Supprimer TOUTES les données et repartir sur une base 100% vierge (sans données de démonstration) ? Cette action est irréversible !")) return;
    clearAllData();
    toast.success("Données effacées. L'application va redémarrer propre...");
    setTimeout(() => window.location.reload(), 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
            <span className="p-2 rounded-xl bg-slate-500/10 text-slate-600">
              <Settings className="w-6 h-6" />
            </span>
            Paramètres & Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez votre boutique, la persistance fichier, réplication et accès multi-PC
          </p>
        </div>
        <Button onClick={handleSave} className={cn("gap-2", saved && "bg-emerald-600 hover:bg-emerald-700")}>
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Enregistré !" : "Enregistrer"}
        </Button>
      </div>

      {/* Section: Boutique */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" /> Informations de la Boutique
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="boutiqueName">Nom de la boutique</Label>
            <Input
              id="boutiqueName"
              value={settings.boutiqueName}
              onChange={e => setSettings(s => ({ ...s, boutiqueName: e.target.value }))}
              placeholder="Boutique Informatique & SAV"
            />
          </div>
          <div>
            <Label htmlFor="technicienName">Nom du technicien / gérant par défaut</Label>
            <Input
              id="technicienName"
              value={settings.technicienName || ""}
              onChange={e => setSettings(s => ({ ...s, technicienName: e.target.value }))}
              placeholder="Sofiane, Riad..."
            />
          </div>
          <div>
            <Label htmlFor="boutiquePhone">Téléphone boutique</Label>
            <Input
              id="boutiquePhone"
              value={settings.boutiquePhone || ""}
              onChange={e => setSettings(s => ({ ...s, boutiquePhone: e.target.value }))}
              placeholder="+216 71 XXX XXX / 20 XXX XXX"
            />
          </div>
          <div>
            <Label htmlFor="boutiqueAddress">Adresse boutique</Label>
            <Input
              id="boutiqueAddress"
              value={settings.boutiqueAddress || ""}
              onChange={e => setSettings(s => ({ ...s, boutiqueAddress: e.target.value }))}
              placeholder="Rue, Quartier, Ville"
            />
          </div>
        </div>
      </div>

      {/* Section: Persistance Fichier & Réplication */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-600" /> Persistance Fichier & Réplication Automatique
          </h2>
          <Button size="sm" variant="outline" onClick={handleSyncNow} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Forcer la sauvegarde maintenant
          </Button>
        </div>

        {storageInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/40 border border-border text-xs">
            <div>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" /> Fichier de données actif :
              </p>
              <p className="font-mono text-muted-foreground mt-1 break-all bg-card p-2 rounded border border-border">
                {storageInfo.filePath}
              </p>
              <p className="mt-1.5 text-muted-foreground">
                Taille : <strong>{(storageInfo.size / 1024).toFixed(1)} Ko</strong> · Statut :{" "}
                <span className="text-emerald-600 font-semibold">{storageInfo.exists ? "Actif & Synchronisé" : "Création auto au 1er enregistrement"}</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-amber-600" /> Dossier de réplication (Backups auto) :
              </p>
              <p className="font-mono text-muted-foreground mt-1 break-all bg-card p-2 rounded border border-border">
                {storageInfo.backupDir}
              </p>
              <p className="mt-1.5 text-muted-foreground">
                Historique conservé : <strong>{settings.backupCount} versions</strong> (écrasement auto des plus anciennes)
              </p>
            </div>
          </div>
        )}

        {/* Emplacement personnalisé / Réseau partagé */}
        <div className="space-y-2">
          <Label htmlFor="networkPath">Chemin du fichier de données (Local ou Partage Réseau UNC)</Label>
          <Input
            id="networkPath"
            value={networkPath}
            onChange={e => setNetworkPath(e.target.value)}
            placeholder="ex: \\PC-CAISSE\PartageBoutique\data.json ou D:\Donnees\data.json"
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            💡 Pour un fonctionnement multi-PC sans réinstaller l'app partout : définissez un chemin partagé accessible par tous les postes (ex: <code>\\SERVEUR\BoutiqueSAV\data.json</code>).
          </p>
        </div>

        <div>
          <Label htmlFor="backupCount">Nombre de réplications / sauvegardes automatiques à conserver</Label>
          <Input
            id="backupCount"
            type="number"
            min="1"
            max="30"
            value={settings.backupCount}
            onChange={e => setSettings(s => ({ ...s, backupCount: parseInt(e.target.value) || 7 }))}
            className="w-32 mt-1"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => { downloadExcelFile(); toast.success("Classeur Excel généré et téléchargé !"); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileSpreadsheet className="w-4 h-4" /> Exporter en Excel (.xlsx)
          </Button>
          {storageInfo?.excelExists && window.electronAPI?.openExcelFile && (
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await window.electronAPI?.openExcelFile?.();
                if (!ok) toast.error("Le fichier Excel n'est pas encore créé");
              }}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
            >
              <ExternalLink className="w-4 h-4" /> Ouvrir directement dans Excel
            </Button>
          )}
          {window.electronAPI?.openDataFolder && (
            <Button
              variant="outline"
              onClick={() => window.electronAPI?.openDataFolder?.()}
              className="gap-2"
            >
              <FolderOpen className="w-4 h-4" /> Ouvrir le dossier des fichiers
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Exporter JSON
          </Button>
          <Button onClick={handleImport} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" /> Importer JSON
          </Button>
        </div>
      </div>

      {/* Section: Guide Installation Unique & Partage Multi-Poste */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-emerald-600" /> Procédure Installation Unique (1 seul PC) & Raccourci Réseau
        </h2>
        <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
          <p className="text-foreground font-semibold">
            Pour installer l'application sur un seul PC serveur/caisse et la rendre accessible à tous les autres PC de la boutique :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="font-bold text-primary block mb-1">Étape 1 : PC Principal</span>
              Installez l'application via le setup .exe sur le PC principal de la boutique. Partagez le dossier d'installation ou le dossier de données sur le réseau local Windows (Clic droit &gt; Propriétés &gt; Partage).
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="font-bold text-primary block mb-1">Étape 2 : Copier le raccourci</span>
              Copiez-collez simplement le raccourci ou le dossier partagé sur le bureau des autres postes (ex: <code>\\PC-PRINCIPAL\BoutiqueInformatiqueSAV</code>).
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <span className="font-bold text-primary block mb-1">Étape 3 : Synchronisation</span>
              Tous les postes pointent vers le même fichier de données centralisé avec réplication automatique à chaque action.
            </div>
          </div>
        </div>
      </div>

      {/* Section: Rappels & Appels */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600" /> Rappels d'Appels & Notifications
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={e => setSettings(s => ({ ...s, remindersEnabled: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium">Activer le module de rappels lors des appels clients</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Rappelle automatiquement à l'équipe d'appeler le client pour informer du diagnostic, de la disponibilité d'une pièce ou de la disponibilité pour retrait.
        </p>
      </div>

      {/* Section: Danger Zone */}
      <div className="bg-card border-2 border-red-200 dark:border-red-900/60 rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" /> Zone Dangereuse
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Réinitialiser toutes les données</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Efface TOUTES les données (stock, réparations, clients, finances, rappels). Action irréversible !
            </p>
          </div>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 gap-2 flex-shrink-0"
            onClick={handleResetDemoData}
          >
            <Trash2 className="w-4 h-4" /> Effacer tout
          </Button>
        </div>
      </div>
    </div>
  );
}
