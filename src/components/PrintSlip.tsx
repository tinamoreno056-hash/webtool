import { forwardRef } from 'react';
import { Invoice, Client, CompanySettings } from '@/types/accounting';
import { formatCurrency, formatDate } from '@/lib/storage';

interface PrintSlipProps {
  invoice: Invoice;
  client: Client;
  settings: CompanySettings;
}

export const PrintSlip = forwardRef<HTMLDivElement, PrintSlipProps>(
  ({ invoice, client, settings }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[11in] max-w-[8.5in] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{settings.name}</h1>
            <p className="text-gray-600 mt-1">{settings.address}</p>
            <p className="text-gray-600">Phone: {settings.phone}</p>
            <p className="text-gray-600">Email: {settings.email}</p>
            {settings.taxId && <p className="text-gray-600">Tax ID: {settings.taxId}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-800">INVOICE</h2>
            <p className="text-xl font-semibold text-gray-600 mt-2">{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Client & Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To:</h3>
            <p className="font-semibold text-lg">{client.name}</p>
            {client.company && <p className="text-gray-600">{client.company}</p>}
            <p className="text-gray-600">{client.address}</p>
            <p className="text-gray-600">Phone: {client.phone}</p>
            <p className="text-gray-600">Email: {client.email}</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Issue Date:</span>
                <span className="font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-medium">{formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid Date:</span>
                  <span className="font-medium text-green-600">{formatDate(invoice.paidDate)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-500">Status:</span>
                <span className={`font-bold uppercase ${
                  invoice.status === 'paid' ? 'text-green-600' :
                  invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-800'
                }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left py-3 px-4 font-semibold">Description</th>
              <th className="text-center py-3 px-4 font-semibold">Qty</th>
              <th className="text-right py-3 px-4 font-semibold">Rate</th>
              <th className="text-right py-3 px-4 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-4">{item.description}</td>
                <td className="py-3 px-4 text-center">{item.quantity}</td>
                <td className="py-3 px-4 text-right">{formatCurrency(item.rate)}</td>
                <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium">{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="flex justify-between py-3 bg-gray-800 text-white px-4 -mx-4 mt-2">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-lg">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 mt-auto">
          <div className="text-center text-gray-500 text-sm">
            <p>Thank you for your business!</p>
            <p className="mt-2">{settings.website}</p>
            <p className="mt-4 text-xs">Generated by AccuBooks - Developed by Ehsaan Ahmad</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintSlip.displayName = 'PrintSlip';
