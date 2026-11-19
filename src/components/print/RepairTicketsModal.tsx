import React from "react";
import {
  Printer, X, Wrench, Smartphone, CheckCircle, ShieldCheck,
  Calendar, Phone, User, KeyRound, Lock, Scissors
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDateTime } from "@/lib/utils";
import { settingsStorage } from "@/lib/storage";
import type { RepairItem } from "@/types";

interface Props {
  repair: RepairItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 3x3 grid coordinates for drawing pattern
const DOT_COORDS: Record<number, { x: number; y: number }> = {
  1: { x: 25, y: 25 },
  2: { x: 65, y: 25 },
  3: { x: 105, y: 25 },
  4: { x: 25, y: 65 },
  5: { x: 65, y: 65 },
  6: { x: 105, y: 65 },
  7: { x: 25, y: 105 },
  8: { x: 65, y: 105 },
  9: { x: 105, y: 105 },
};

function parsePattern(patternStr?: string): number[] {
  if (!patternStr) return [];
  // Extract all single digits 1-9
  const digits = patternStr.replace(/[^1-9]/g, "").split("").map(Number);
  return digits;
}

export function PatternDisplay({ pattern, size = 130 }: { pattern?: string; size?: number }) {
  const steps = parsePattern(pattern);
  const stepMap = new Map<number, number>();
  steps.forEach((dot, idx) => {
    if (!stepMap.has(dot)) stepMap.set(dot, idx + 1);
  });

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 130 130"
        className="bg-white rounded-lg border border-gray-300 shadow-inner"
      >
        {/* Draw lines between points */}
        {steps.map((dot, i) => {
          if (i === steps.length - 1) return null;
          const nextDot = steps[i + 1];
          const from = DOT_COORDS[dot];
          const to = DOT_COORDS[nextDot];
          if (!from || !to) return null;
          return (
            <line
              key={`line-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinecap="round"
            />
          );
        })}

        {/* Draw 9 dots */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((dot) => {
          const pt = DOT_COORDS[dot];
          const isSelected = stepMap.has(dot);
          const stepOrder = stepMap.get(dot);

          return (
            <g key={`dot-${dot}`}>
              {/* Outer ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 11 : 6}
                fill={isSelected ? "#2563eb" : "#cbd5e1"}
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* Step number inside */}
              {isSelected && (
                <text
                  x={pt.x}
                  y={pt.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {stepOrder}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {pattern && (
        <span className="text-[11px] font-mono mt-1 font-semibold text-gray-700">
          Ordre : {pattern}
        </span>
      )}
    </div>
  );
}

export default function RepairTicketsModal({ repair, open, onOpenChange }: Props) {
  if (!repair) return null;

  const settings = settingsStorage.get();
  const cout = repair.coutFinal || repair.coutEstime || 0;
  const avance = repair.avancePayee || 0;
  const reste = Math.max(0, cout - avance);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              Impression simultanée des 2 tickets SAV
            </span>
            <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded">
              Ticket {repair.numeroTicket}
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ticket 1 pour le client (récépissé) + Ticket 2 étiquette pour l'atelier (à coller sur l'appareil avec PIN / Schéma)
          </p>
        </DialogHeader>

        {/* CONTAINER IMPRIMABLE */}
        <div id="printable-tickets-root" className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 text-black">
          
          {/* ======================================================== */}
          {/* TICKET 1 : RÉCÉPISSÉ CLIENT                             */}
          {/* ======================================================== */}
          <div className="ticket-client border-2 border-dashed border-gray-400 bg-white p-4 rounded-xl text-black shadow-sm flex flex-col justify-between">
            <div>
              {/* En-tête Boutique */}
              <div className="text-center pb-3 border-b-2 border-gray-800">
                <div className="flex items-center justify-center gap-1.5 font-bold text-base uppercase tracking-wide text-gray-900">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  {settings.boutiqueName || "BOUTIQUE INFORMATIQUE & SAV"}
                </div>
                <p className="text-[11px] text-gray-600 font-medium">
                  Atelier de Réparation Smartphone, PC & Électronique
                </p>
                {settings.boutiquePhone && (
                  <p className="text-xs font-bold text-gray-800 mt-0.5">
                    📞 Tél Boutique : {settings.boutiquePhone}
                  </p>
                )}
                {settings.boutiqueAddress && (
                  <p className="text-[10px] text-gray-500">{settings.boutiqueAddress}</p>
                )}
              </div>

              {/* Titre Ticket */}
              <div className="my-3 text-center bg-gray-100 py-1.5 rounded border border-gray-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
                  Récépissé de Dépôt Client
                </span>
                <span className="text-lg font-black font-mono tracking-wider text-gray-900">
                  {repair.numeroTicket}
                </span>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  Dépôt le {formatDateTime(repair.dateReception)}
                </p>
              </div>

              {/* Données Client & Appareil */}
              <div className="space-y-2 text-xs border-b border-gray-200 pb-3">
                <div className="flex justify-between bg-gray-50 p-1.5 rounded">
                  <span className="text-gray-600 font-medium">Client :</span>
                  <span className="font-bold text-gray-900">{repair.clientNom}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-gray-600 font-medium">Téléphone :</span>
                  <span className="font-mono font-bold text-gray-900">{repair.clientTel}</span>
                </div>
                <div className="flex justify-between px-1">
                  <span className="text-gray-600 font-medium">Appareil :</span>
                  <span className="font-bold text-gray-900">{repair.appareil}</span>
                </div>
                {repair.marque && (
                  <div className="flex justify-between px-1">
                    <span className="text-gray-600 font-medium">Marque / Modèle :</span>
                    <span className="text-gray-800">{repair.marque} {repair.modele}</span>
                  </div>
                )}
                {repair.serialNumber && (
                  <div className="flex justify-between px-1">
                    <span className="text-gray-600 font-medium">N° Série / IMEI :</span>
                    <span className="font-mono text-gray-700">{repair.serialNumber}</span>
                  </div>
                )}
              </div>

              {/* Panne signalée */}
              <div className="my-2 p-2 bg-yellow-50/80 border border-yellow-200 rounded text-xs">
                <span className="font-bold text-yellow-900 block mb-0.5">⚠️ Panne signalée :</span>
                <p className="text-gray-800 italic">{repair.problemeDecrit}</p>
              </div>

              {/* Volet Financier / Avance */}
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-2.5 my-2 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Coût estimé :</span>
                  <span className="font-bold text-gray-900">
                    {cout > 0 ? formatPrice(cout) : "Sur devis"}
                  </span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold border-t border-gray-200 pt-1">
                  <span>Avance versée :</span>
                  <span>{formatPrice(avance)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-gray-900 border-t-2 border-gray-300 pt-1">
                  <span>Reste à payer :</span>
                  <span className={reste === 0 && cout > 0 ? "text-emerald-700" : "text-amber-800"}>
                    {reste === 0 && cout > 0 ? "PAYÉ EN TOTALITÉ" : formatPrice(reste)}
                  </span>
                </div>
              </div>

              {/* Conditions / Avertissement */}
              <div className="text-[10px] text-gray-600 space-y-1 mt-2 border-t border-gray-200 pt-2 leading-tight">
                <p className="font-semibold text-gray-800">
                  📌 Conservez ce ticket pour le retrait de votre appareil.
                </p>
                <p>
                  Pour toute information concernant l'avancement, contactez-nous en mentionnant votre N° de ticket : <strong className="text-black">{repair.numeroTicket}</strong>.
                </p>
                <p className="italic text-gray-500">
                  Tout appareil non réclamé après 90 jours pourra faire l'objet de frais de gardiennage.
                </p>
              </div>
            </div>

            {/* Signature & Cachet */}
            <div className="mt-4 pt-3 border-t border-gray-300 grid grid-cols-2 text-center text-[10px] text-gray-500">
              <div>Signature Client</div>
              <div>Cachet de la Boutique</div>
            </div>
          </div>


          {/* ======================================================== */}
          {/* TICKET 2 : ÉTIQUETTE ATELIER (À COLLER SUR LA PIÈCE)    */}
          {/* ======================================================== */}
          <div className="ticket-atelier border-2 border-solid border-blue-600 bg-white p-4 rounded-xl text-black shadow-sm flex flex-col justify-between relative">
            
            {/* Ligne de découpe visible */}
            <div className="absolute -top-3 left-6 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Scissors className="w-3 h-3" /> ÉTIQUETTE À COLLER SUR L'APPAREIL
            </div>

            <div>
              {/* En-tête Atelier */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-blue-600 mt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    FICHE ATELIER / PIÈCE
                  </span>
                  <span className="text-xl font-black font-mono tracking-wider text-blue-900">
                    {repair.numeroTicket}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-gray-500 block">Priorité</span>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-gray-100 border">
                    {repair.priorite}
                  </span>
                </div>
              </div>

              {/* Coordonnées Client & Appareil */}
              <div className="my-2.5 p-2 bg-gray-50 rounded border border-gray-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client :</span>
                  <span className="font-bold text-gray-900">{repair.clientNom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tél :</span>
                  <span className="font-mono font-bold text-blue-700">{repair.clientTel}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1">
                  <span className="text-gray-500">Appareil :</span>
                  <span className="font-bold text-gray-900">{repair.appareil}</span>
                </div>
                {repair.marque && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modèle :</span>
                    <span className="font-medium text-gray-800">{repair.marque} {repair.modele}</span>
                  </div>
                )}
              </div>

              {/* ZONE SÉCURITÉ : CODE PIN & SCHÉMA (TRÈS IMPORTANT) */}
              <div className="my-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">
                  <Lock className="w-4 h-4 text-blue-700" />
                  Déverrouillage de l'appareil
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  {/* Code PIN */}
                  <div className="bg-white p-2.5 rounded border border-blue-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                      Code PIN / Mot de Passe
                    </span>
                    <div className="text-lg font-mono font-black text-blue-800 tracking-widest mt-1">
                      {repair.pinAppareil ? repair.pinAppareil : "AUCUN"}
                    </div>
                  </div>

                  {/* Schéma de déverrouillage */}
                  <div className="text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-600 block mb-1">
                      Schéma Android
                    </span>
                    <PatternDisplay pattern={repair.schemaUnlock} size={90} />
                  </div>
                </div>
              </div>

              {/* Description Panne */}
              <div className="p-2 bg-red-50/80 border border-red-200 rounded text-xs mb-2">
                <span className="font-bold text-red-900 block mb-0.5">Travaux à effectuer :</span>
                <p className="text-gray-900 font-medium">{repair.problemeDecrit}</p>
              </div>

              {/* Technicien & Finances atelier */}
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-200 pt-2">
                <div>
                  <span className="text-gray-500 block text-[10px]">Technicien :</span>
                  <span className="font-bold text-gray-800">
                    {repair.technicien ? repair.technicien : "Non assigné"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 block text-[10px]">Reste à encaisser :</span>
                  <span className="font-extrabold text-blue-700 font-mono">
                    {formatPrice(reste)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pied Étiquette */}
            <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-300 text-center text-[10px] text-gray-400 font-mono">
              COLLER CETTE ÉTIQUETTE SUR LA COQUE ARRIÈRE OU LA PIÈCE
            </div>
          </div>

        </div>

        <DialogFooter className="gap-2 sm:justify-between border-t pt-3 mt-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Les deux tickets s'impriment simultanément sur votre imprimante.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="w-4 h-4" />
              Imprimer les 2 Tickets
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
