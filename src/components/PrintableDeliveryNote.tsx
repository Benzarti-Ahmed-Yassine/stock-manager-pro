import React, { forwardRef } from 'react';
import { DeliveryNote, Client } from '@/lib/types';
import { ToWords } from 'to-words';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Utility to convert numbers to words (in French)
const toWords = new ToWords({
  localeCode: 'fr-FR',
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: true,
    currencyOptions: {
      name: 'Dinars',
      plural: 'Dinars',
      symbol: 'DT',
      fractionalUnit: {
        name: 'Millimes',
        plural: 'Millimes',
        symbol: '',
      },
    },
  },
});

interface PrintableDeliveryNoteProps {
  deliveryNote: DeliveryNote;
  client: Client;
}

export const PrintableDeliveryNote = forwardRef<HTMLDivElement, PrintableDeliveryNoteProps>(
  ({ deliveryNote, client }, ref) => {
    
    // Group items by VAT for the bottom table (M.Exo, 7%, 13%, 19%, Base, TVA)
    const vatBreakdown = deliveryNote.items.reduce((acc, item) => {
      const v = item.vat || 19;
      if (!acc[v]) {
        acc[v] = { base: 0, amount: 0 };
      }
      acc[v].base += item.totalHT;
      acc[v].amount += item.totalHT * (v / 100);
      return acc;
    }, {} as Record<number, { base: number, amount: number }>);

    return (
      <div ref={ref} className="bg-white text-black px-12 py-8 text-sm font-sans w-full mx-auto" style={{
        width: '210mm',
        minHeight: '297mm',
      }}>
        {/* Print specific styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              margin: 15mm;
            }
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}} />

        <div id="printable-area" style={{ position: 'relative' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b border-gray-300 pb-4">
            <div className="w-1/2">
              {/* Logo Placeholder */}
              <div className="border border-gray-400 rounded-[50%] px-6 py-2 inline-block mb-2 text-center text-gray-700">
                <span className="font-bold text-xl uppercase tracking-widest block">SOBRATECH</span>
                <span className="text-xs tracking-widest text-gray-400 font-semibold block">S O C I E T E</span>
              </div>
              <div className="text-xs text-gray-600 leading-tight">
                <p>500 Rue Malta 5015 Bouhjar</p>
                <p>Tel: 73 565 985 - 73 565 987</p>
                <p>MF: 1000000/Y/A/M/000</p>
              </div>
            </div>
          </div>

          {/* Title and Client Details */}
          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-gray-800">
                Bon de Livraison N° :
              </h2>
              <span className="text-xl font-bold">{deliveryNote.noteNumber}</span>
            </div>

            <div className="flex justify-between mb-4 mt-6">
              <div className="w-2/3 border border-gray-300 rounded p-4 text-xs font-semibold leading-relaxed">
                <div className="flex gap-2">
                  <span className="w-24 text-gray-500">Client :</span>
                  <span>{client.id.substring(0, 8).toUpperCase()} - {client.company || client.name}</span>
                </div>
                {client.category !== 'comptoir' && (
                  <>
                    <div className="flex gap-2">
                      <span className="w-24 text-gray-500">Adresse :</span>
                      <span>{client.address || ''}</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-200">
                      <span className="w-24 text-gray-500">Mat. Fiscal :</span>
                      <span>{client.matriculeFiscal || ''}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-1/4 text-xs font-semibold">
                <div className="flex justify-between items-center bg-gray-100 p-2 border border-gray-300 mb-2">
                  <span>DATE</span>
                  <span>{format(new Date(deliveryNote.date), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>N° Page:</span>
                  <span>1/1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="min-h-[400px]">
            <table className="w-full border-collapse border border-gray-300 text-xs text-center">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="border-r border-gray-300 py-2 w-10">N° Lig</th>
                  <th className="border-r border-gray-300 py-2 w-20">Code Art</th>
                  <th className="border-r border-gray-300 py-2 text-left pl-2">Désignation</th>
                  <th className="border-r border-gray-300 py-2 w-16">Quantité</th>
                  <th className="border-r border-gray-300 py-2 w-20">Prix Unit</th>
                  <th className="border-r border-gray-300 py-2 w-12 text-gray-500">TVA</th>
                  <th className="border-r border-gray-300 py-2 w-12 text-gray-500">REM</th>
                  <th className="border-r border-gray-300 py-2 w-24">Total HT</th>
                  <th className="py-2 w-24">Prix TTC</th>
                </tr>
              </thead>
              <tbody>
                {deliveryNote.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200 h-8">
                    <td className="border-r border-gray-300">{index + 1}</td>
                    <td className="border-r border-gray-300">{item.productId.substring(0, 6)}</td> {/* Or an actual code */}
                    <td className="border-r border-gray-300 text-left pl-2 font-medium">{item.productName}</td>
                    <td className="border-r border-gray-300">{item.quantity}</td>
                    <td className="border-r border-gray-300">{item.unitPrice.toFixed(3)}</td>
                    <td className="border-r border-gray-300">{item.vat}%</td>
                    <td className="border-r border-gray-300">{item.discount || 0}</td>
                    <td className="border-r border-gray-300">{item.totalHT.toFixed(3)}</td>
                    <td className="">{item.totalTTC.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Totals */}
          <div className="flex mt-4 gap-4 text-xs font-semibold">
            {/* VAT Summary Table */}
            <div className="w-2/3">
              <table className="w-full border-collapse border border-gray-300 text-center text-gray-700">
                <thead>
                  <tr className="bg-gray-100 uppercase">
                    <th className="border border-gray-300 py-1 font-normal w-24">M.Exo</th>
                    <th className="border border-gray-300 py-1 font-normal">7%</th>
                    <th className="border border-gray-300 py-1 font-normal">13%</th>
                    <th className="border border-gray-300 py-1 font-normal">19%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 py-1 text-left pl-2 bg-gray-50">Bas</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[7]?.base.toFixed(3) || ""}</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[13]?.base.toFixed(3) || ""}</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[19]?.base.toFixed(3) || ""}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 py-1 text-left pl-2 bg-gray-50">TVA</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[7]?.amount.toFixed(3) || ""}</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[13]?.amount.toFixed(3) || ""}</td>
                    <td className="border border-gray-300 py-1">{vatBreakdown[19]?.amount.toFixed(3) || ""}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 border border-gray-300 p-2 px-4 rounded text-xs bg-gray-50">
                <span className="block font-bold mb-1">Arreté le présent Bon De Livraison A La somme de :</span>
                <span className="uppercase text-gray-700 italic tracking-wider">
                  {toWords.convert(deliveryNote.totalTTC)}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 italic mt-3 text-center">
                Notre Marchandise ne sera ni reprise ni échangée et reste à la propriété de la société jusqu'à son paiement intégral.
              </p>
            </div>

            {/* Total Summary */}
            <div className="w-1/3 border border-gray-300">
              <div className="flex justify-between p-1 px-2 border-b border-gray-300 bg-gray-50">
                <span>TOTAL</span>
                <span>{(deliveryNote.subTotalHT + deliveryNote.totalDiscount).toFixed(3)}</span>
              </div>
              <div className="flex justify-between p-1 px-2 border-b border-gray-300">
                <span>REMISE</span>
                <span>{deliveryNote.totalDiscount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between p-1 px-2 border-b border-gray-300 bg-gray-50">
                <span>Total HT</span>
                <span>{deliveryNote.subTotalHT.toFixed(3)}</span>
              </div>
              <div className="flex justify-between p-1 px-2 border-b border-gray-300">
                <span>TVA</span>
                <span>{deliveryNote.totalVat.toFixed(3)}</span>
              </div>
              <div className="flex justify-between p-1 px-2 border-b border-gray-300">
                <span>Timbre</span>
                <span>{deliveryNote.stamp.toFixed(3)}</span>
              </div>
              <div className="flex justify-between p-2 px-2 bg-gray-200 font-bold text-sm">
                <span className="uppercase">Net à payer</span>
                <span>{deliveryNote.totalTTC.toFixed(3)}</span>
              </div>
              {/* Acompte / Reste à payer rows */}
              {deliveryNote.acompte && deliveryNote.acompte > 0 && !deliveryNote.paid && (
                <>
                  <div className="flex justify-between p-1 px-2 border-b border-gray-300 bg-amber-50">
                    <span>ACOMPTE</span>
                    <span>-{deliveryNote.acompte.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between p-2 px-2 bg-amber-100 font-bold text-sm border-t-2 border-amber-400">
                    <span className="uppercase">Reste à payer</span>
                    <span>{(deliveryNote.resteAPayer ?? Math.max(0, deliveryNote.totalTTC - deliveryNote.acompte)).toFixed(3)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PAYÉ watermark */}
          {deliveryNote.paid && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
              <div
                className="text-green-500 font-black uppercase tracking-[0.3em] border-8 border-green-500 px-12 py-4"
                style={{
                  fontSize: '5rem',
                  opacity: 0.15,
                  transform: 'rotate(-30deg)',
                }}
              >
                PAYÉ
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="flex justify-between mt-8 text-xs font-semibold px-8 h-24">
            <div className="w-1/3 flex flex-col justify-end items-center">
              <span className="border-t border-gray-400 w-full text-center pt-2">Signature Client</span>
            </div>
            <div className="w-1/3 flex flex-col justify-end items-center">
              <span className="border-t border-gray-400 w-full text-center pt-2">Signature Livreur</span>
            </div>
            <div className="w-1/3 flex flex-col justify-end items-center mb-6">
              <div className="border border-blue-300 text-blue-800 rounded px-6 py-4 text-center mt-[-40px]">
                <span className="block font-bold">Sté SOBRATECH</span>
                <span className="block text-[10px]">Vente En Gros des Matériels Électriques</span>
                <span className="block text-[10px]">Rue Malta, Bouhjar 5015</span>
              </div>
              <span className="w-full text-center pt-2 text-gray-500 font-normal">Signature Société</span>
            </div>
          </div>

        </div>
      </div>
    );
  }
);
PrintableDeliveryNote.displayName = 'PrintableDeliveryNote';
