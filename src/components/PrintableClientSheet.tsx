import React, { forwardRef } from 'react';
import { ClientSheet, DeliveryNote, Client } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PrintableClientSheetProps {
  sheet: ClientSheet;
  client: Client;
  notes: DeliveryNote[];
}

export const PrintableClientSheet = forwardRef<HTMLDivElement, PrintableClientSheetProps>(
  ({ sheet, client, notes }, ref) => {
    
    // Calculate totals for summary
    const summary = sheet.items.map(item => {
      let delivered = 0;
      notes.forEach(n => {
        n.items.forEach(ni => {
          if (ni.productId === item.productId) {
            delivered += ni.quantity;
          }
        });
      });
      return {
        ...item,
        delivered,
        remaining: Math.max(0, item.quantity - delivered)
      };
    });

    return (
      <div ref={ref} className="bg-white text-black px-12 py-8 text-sm font-sans w-full mx-auto" style={{
        width: '210mm',
        minHeight: '297mm',
      }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              margin: 15mm;
            }
            body * {
              visibility: hidden;
            }
            #printable-sheet, #printable-sheet * {
              visibility: visible;
            }
            #printable-sheet {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}} />

        <div id="printable-sheet">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-gray-800 pb-4">
            <div>
              <div className="border-2 border-gray-800 rounded-[50%] px-6 py-2 inline-block mb-2 text-center">
                <span className="font-bold text-xl uppercase tracking-widest block">SOBRATECH</span>
                <span className="text-xs tracking-widest text-gray-500 font-semibold block">S O C I E T E</span>
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                <p>500 Rue Malta 5015 Bouhjar</p>
                <p>Tel: 73 565 985</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black uppercase text-gray-800">Fiche Matériel</h2>
              <p className="text-lg font-bold">{sheet.name}</p>
              <p className="text-xs text-gray-500">Date de création: {format(new Date(sheet.date), "dd/MM/yyyy", { locale: fr })}</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-2">Informations Client</h3>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              <span className="text-gray-500">Nom / Société :</span>
              <span className="font-bold">{client.company || client.name}</span>
              <span className="text-gray-500">Catégorie :</span>
              <span className="font-bold uppercase">{client.category}</span>
              {client.phone && (
                <>
                  <span className="text-gray-500">Téléphone :</span>
                  <span className="font-bold">{client.phone}</span>
                </>
              )}
              {client.address && (
                <>
                  <span className="text-gray-500">Adresse :</span>
                  <span className="font-bold">{client.address}</span>
                </>
              )}
            </div>
          </div>

          {/* Planned Materials & Progress */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3">Récapitulatif - État d'avancement</h3>
            <table className="w-full border-collapse text-xs text-center">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="py-2 px-2 text-left">Désignation</th>
                  <th className="py-2 px-2 w-24">Qté Prévue</th>
                  <th className="py-2 px-2 w-24">Qté Livrée</th>
                  <th className="py-2 px-2 w-24">Reste à Livrer</th>
                  <th className="py-2 px-2 w-20">Progrès</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(item => {
                  const pct = Math.round((item.delivered / item.quantity) * 100);
                  return (
                    <tr key={item.id} className="border-b border-gray-200 h-8">
                      <td className="text-left px-2 font-medium">{item.productName}</td>
                      <td className="font-bold bg-gray-50">{item.quantity}</td>
                      <td className="text-green-600 font-bold">{item.delivered}</td>
                      <td className={item.remaining > 0 ? "text-amber-600 font-bold" : "text-gray-400 font-bold"}>
                        {item.remaining}
                      </td>
                      <td className="font-bold">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* List of Delivery Notes */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-4">Historique des Livraisons (Bons de Livraison)</h3>
            
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun bon de livraison associé à cette fiche.</p>
            ) : (
              <div className="space-y-6">
                {notes.map(note => (
                  <div key={note.id} className="border border-gray-300 rounded overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-300">
                      <div className="flex items-center gap-3">
                        <span className="font-bold">BL N° {note.noteNumber}</span>
                        {note.paid ? (
                          <span className="bg-green-100 text-green-800 text-[9px] px-2 py-0.5 rounded-full border border-green-200 font-black">PAYÉ</span>
                        ) : note.acompte && note.acompte > 0 ? (
                          <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded-full border border-amber-200 font-black">ACOMPTE</span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-[9px] px-2 py-0.5 rounded-full border border-red-200 font-black">NON PAYÉ</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">Date: {format(new Date(note.date), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                    </div>
                    <table className="w-full text-[10px] text-center">
                      <thead>
                        <tr className="text-gray-500 uppercase border-b border-gray-200">
                          <th className="py-1 px-4 text-left">Article</th>
                          <th className="py-1 px-4 w-20">Quantité</th>
                          <th className="py-1 px-4 w-32">Prix Unit (HT)</th>
                          <th className="py-1 px-4 w-32">Total (TTC)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {note.items.map(ni => (
                          <tr key={ni.id} className="border-b border-gray-100 last:border-0">
                            <td className="py-1 px-4 text-left">{ni.productName}</td>
                            <td className="py-1 px-4 font-bold">{ni.quantity}</td>
                            <td className="py-1 px-4">{ni.unitPrice.toFixed(3)}</td>
                            <td className="py-1 px-4 font-bold">{ni.totalTTC.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 text-[9px]">
                        <tr>
                          <td colSpan={3} className="py-1 px-4 text-right border-t border-gray-200">TOTAL TTC :</td>
                          <td className="py-1 px-4 text-right font-bold border-t border-gray-200">{note.totalTTC.toFixed(3)} DT</td>
                        </tr>
                        {note.acompte && note.acompte > 0 && !note.paid && (
                          <>
                            <tr>
                              <td colSpan={3} className="py-0.5 px-4 text-right text-amber-600 italic">Dont Acompte versé :</td>
                              <td className="py-0.5 px-4 text-right text-amber-600 italic">-{note.acompte.toFixed(3)} DT</td>
                            </tr>
                            <tr className="border-t border-gray-200 bg-amber-50">
                              <td colSpan={3} className="py-1 px-4 text-right font-bold">RESTE À PAYER SUR CE BL :</td>
                              <td className="py-1 px-4 text-right font-bold text-amber-700">{(note.resteAPayer || (note.totalTTC - note.acompte)).toFixed(3)} DT</td>
                            </tr>
                          </>
                        )}
                        {!note.paid && !note.acompte && (
                           <tr className="border-t border-gray-200 bg-red-50">
                              <td colSpan={3} className="py-1 px-4 text-right font-bold">RESTE À PAYER SUR CE BL :</td>
                              <td className="py-1 px-4 text-right font-bold text-red-700">{note.totalTTC.toFixed(3)} DT</td>
                           </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global Financial Summary */}
          {notes.length > 0 && (
            <div className="mb-8 break-inside-avoid">
              <h3 className="text-sm font-bold uppercase border-b-2 border-gray-800 pb-1 mb-3">Résumé Financier Global de la Fiche</h3>
              <div className="flex justify-end">
                <table className="w-1/2 border-collapse border-2 border-gray-800 text-xs shadow-sm">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-4 bg-gray-100 font-bold uppercase">Total Cumulé (TTC)</td>
                      <td className="py-2 px-4 text-right font-bold text-lg">
                        {notes.reduce((acc, n) => acc + n.totalTTC, 0).toFixed(3)} DT
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="py-2 px-4 bg-gray-50 text-gray-600">Total Payé / Acomptes</td>
                      <td className="py-2 px-4 text-right font-bold text-green-600">
                        {notes.reduce((acc, n) => acc + (n.paid ? n.totalTTC : (n.acompte || 0)), 0).toFixed(3)} DT
                      </td>
                    </tr>
                    <tr className="bg-gray-800 text-white">
                      <td className="py-3 px-4 font-black uppercase tracking-wider">Net Restant à Payer</td>
                      <td className="py-3 px-4 text-right font-black text-xl">
                        {notes.reduce((acc, n) => acc + (n.paid ? 0 : (n.resteAPayer || (n.totalTTC - (n.acompte || 0)))), 0).toFixed(3)} DT
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-[10px] text-gray-400 flex justify-between">
            <span>SOBRATECH - Système de Gestion de Stock</span>
            <span>Imprimé le {format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
          </div>
        </div>
      </div>
    );
  }
);

PrintableClientSheet.displayName = 'PrintableClientSheet';
