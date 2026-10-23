import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  FileText, ArrowLeft, Download, RefreshCw
} from 'lucide-react';

interface StatementEntry {
  id: string;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  entryType: string;
  description: string;
  amount: number;
  runningBalance: number;
  orderId?: string;
  metadata?: any;
}

interface AccountStatementPageProps {
  partyType: string;
  partyId: string;
  initialAccountName?: string;
  onBack: () => void;
}

export const AccountStatementPage: React.FC<AccountStatementPageProps> = ({
  partyType,
  partyId,
  initialAccountName,
  onBack,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [statement, setStatement] = useState<StatementEntry[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  const loadStatement = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/api/admin/payouts/statement/${partyType.toLowerCase()}/${partyId}`);
      if (res?.success) {
        setStatement(res.statement || []);
        setAccount(res.account);
        setOpeningBalance(res.openingBalance || 0);
        setClosingBalance(res.closingBalance || 0);
      }
    } catch (err) {
      console.error('Failed to load passbook statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatement();
  }, [partyType, partyId]);

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const handleExportCSV = () => {
    if (statement.length === 0) return;
    const headers = ['Date', 'Entry Type', 'Description', 'Type', 'Amount', 'Running Balance'];
    const rows = statement.map(e => [
      `"${new Date(e.date).toLocaleString('en-IN')}"`,
      `"${e.entryType}"`,
      `"${e.description || ''}"`,
      `"${e.type}"`,
      `"${e.amount}"`,
      `"${e.runningBalance}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `statement_${partyType}_${partyId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm transition-all"
            title="Back to Accounts"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-600" />
              {account?.accountName || initialAccountName || 'Partner'} — Passbook Statement
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Immutable double-entry ledger statement showing complete chronological credits, debits, and running balance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={statement.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-gray-900 shadow-sm transition-all flex items-center gap-2 text-xs font-bold disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={loadStatement}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Account Balance Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Opening Balance</span>
          <div className="text-xl font-bold text-gray-600 font-mono">
            {formatINR(openingBalance)}
          </div>
          <p className="text-[11px] text-gray-400">Account initialization baseline</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ledger Entries Count</span>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {statement.length} Records
          </div>
          <p className="text-[11px] text-gray-400">Total double-entry ledger transactions</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Current Closing Balance</span>
          <div className="text-2xl font-black text-emerald-900 font-mono">
            {formatINR(account?.currentBalance ?? closingBalance)}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold">Net cleared & withdrawable funds</p>
        </div>
      </div>

      {/* Statement Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
            Loading double-entry ledger statement...
          </div>
        ) : statement.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No ledger transactions recorded for this account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Entry Type</th>
                  <th className="py-3 px-4 text-right">Debit (-)</th>
                  <th className="py-3 px-4 text-right">Credit (+)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statement.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                      {new Date(entry.date).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{entry.description || 'Ledger Entry'}</div>
                      {entry.orderId && (
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Order ID: {entry.orderId}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                        entry.type === 'CREDIT'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {entry.entryType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-red-600">
                      {entry.type === 'DEBIT' ? `- ${formatINR(entry.amount)}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {entry.type === 'CREDIT' ? `+ ${formatINR(entry.amount)}` : '—'}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-gray-900 text-sm">
                      {formatINR(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
