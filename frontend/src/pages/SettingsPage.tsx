import React, { useState, useEffect } from 'react';
import {
  Settings,
  Workflow,
  Key,
  Database,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Building,
  FileCheck
} from 'lucide-react';
import { n8nApi, supplierApi, poApi, invoiceApi } from '../services/api';
import { Invoice } from '../types';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'n8n' | 'suppliers' | 'pos' | 'system'>('n8n');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('INV-1001');
  const [simulationTrace, setSimulationTrace] = useState<any[] | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Suppliers & POs data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupGstin, setNewSupGstin] = useState<string>('');
  const [newPoNumber, setNewPoNumber] = useState<string>('');
  const [newPoAmount, setNewPoAmount] = useState<string>('');
  const [newPoSupplierId, setNewPoSupplierId] = useState<number>(1);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [invRes, supRes, poRes] = await Promise.all([
          invoiceApi.getAll(),
          supplierApi.getAll(),
          poApi.getAll()
        ]);
        setInvoices(invRes.data);
        if (invRes.data.length > 0) setSelectedInvoiceId(invRes.data[0].id);
        setSuppliers(supRes.data);
        setPos(poRes.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadInitialData();
  }, []);

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimulationTrace(null);
    try {
      const res = await n8nApi.simulate(selectedInvoiceId);
      setSimulationTrace(res.data.trace);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Simulation error.');
    } finally {
      setSimulating(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupGstin) return;
    try {
      await supplierApi.create({ supplier_name: newSupName, gstin: newSupGstin });
      setFeedbackMsg(`Supplier '${newSupName}' created successfully.`);
      setNewSupName('');
      setNewSupGstin('');
      const res = await supplierApi.getAll();
      setSuppliers(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add supplier.');
    }
  };

  const handleAddPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNumber || !newPoAmount) return;
    try {
      await poApi.create({
        po_number: newPoNumber,
        expected_amount: parseFloat(newPoAmount),
        supplier_id: newPoSupplierId
      });
      setFeedbackMsg(`PO '${newPoNumber}' created successfully.`);
      setNewPoNumber('');
      setNewPoAmount('');
      const res = await poApi.getAll();
      setPos(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add PO.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">System Settings & n8n Automation Engine</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500 text-slate-950">
              Orchestration Center
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure n8n webhook pipelines, master vendor databases, PO reconciliation tables, and API keys.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('n8n')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'n8n' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>n8n Pipeline Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Supplier Master ({suppliers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pos' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Purchase Orders ({pos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'system' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API & Security Config</span>
          </button>
        </div>

        {/* Tab 1: n8n Workflow Interactive Simulator */}
        {activeTab === 'n8n' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  <Workflow className="w-5 h-5 text-teal-400" />
                  <span>8-Node n8n Workflow Execution Simulator</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Test the exact webhook validation, AI summarization, and Gmail notification pipeline adapted from your n8n workflow.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-800 text-white rounded-lg border border-slate-700"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.id} ({inv.invoice_number})</option>
                  ))}
                </select>

                <button
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                  <span>{simulating ? 'Executing Pipeline...' : 'Run Pipeline'}</span>
                </button>
              </div>
            </div>

            {/* Visual Node Diagram */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-3">Workflow Architecture Trace</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Node 1</span>
                  <p className="font-bold text-slate-800">Webhook - New Invoice</p>
                  <span className="text-[10px] text-slate-400">Trigger from FastAPI</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Node 2 & 3</span>
                  <p className="font-bold text-slate-800">Validate Data & IF Node</p>
                  <span className="text-[10px] text-slate-400">Payload schema guard</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Node 4</span>
                  <p className="font-bold text-slate-800">AI Analysis & Storage</p>
                  <span className="text-[10px] text-slate-400">Synthesizes anomaly summary</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Node 5 & 8</span>
                  <p className="font-bold text-slate-800">Notifications & Daily Follow-up</p>
                  <span className="text-[10px] text-slate-400">Gmail alert + scheduled queue</span>
                </div>
              </div>
            </div>

            {/* Live Simulation Results */}
            {simulationTrace && (
              <div className="space-y-3 animate-in fade-in">
                <span className="text-xs font-bold text-slate-800 block">Execution Diagnostics Log:</span>
                {simulationTrace.map((step, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                      <strong className="text-white">{step.node}:</strong>
                      <span className="text-teal-300 font-semibold">{step.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-lg">
                      {step.summary || (step.details ? JSON.stringify(step.details) : 'Executed successfully.')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Supplier Master */}
        {activeTab === 'suppliers' && (
          <div className="p-6 space-y-6">
            <form onSubmit={handleAddSupplier} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Cloud Corp"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">GSTIN Number (15 Digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={newSupGstin}
                  onChange={(e) => setNewSupGstin(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 uppercase font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer h-9"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vendor</span>
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">#{s.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{s.supplier_name}</td>
                      <td className="py-3 px-4 font-mono text-teal-700">{s.gstin}</td>
                      <td className="py-3 px-4 text-slate-500">{s.contact_details || 'Verified Vendor'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          APPROVED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Purchase Orders */}
        {activeTab === 'pos' && (
          <div className="p-6 space-y-6">
            <form onSubmit={handleAddPO} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="font-bold text-slate-600 block mb-1">PO Number</label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-9901"
                  value={newPoNumber}
                  onChange={(e) => setNewPoNumber(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 uppercase font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Authorized Vendor</label>
                <select
                  value={newPoSupplierId}
                  onChange={(e) => setNewPoSupplierId(parseInt(e.target.value))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Expected Amount (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={newPoAmount}
                  onChange={(e) => setNewPoAmount(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer h-9"
              >
                <Plus className="w-4 h-4" />
                <span>Create PO</span>
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">Expected Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.po_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{p.supplier_name}</td>
                      <td className="py-3 px-4 font-bold text-teal-800">
                        ₹{p.expected_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: System & Security */}
        {activeTab === 'system' && (
          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">n8n Webhook Endpoint</span>
                <input
                  type="text"
                  readOnly
                  value="http://localhost:5678/webhook/new-invoice"
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-slate-700"
                />
                <p className="text-[11px] text-slate-400">Authenticated with X-Webhook-Secret header</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">FastAPI Local Host</span>
                <input
                  type="text"
                  readOnly
                  value="http://127.0.0.1:8000/api"
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-slate-700"
                />
                <p className="text-[11px] text-slate-400">Interactive Swagger Documentation at /docs</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Storage Vault</span>
                <input
                  type="text"
                  readOnly
                  value="./storage/invoices/"
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-slate-700"
                />
                <p className="text-[11px] text-slate-400">Secure local filesystem persistence</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Document Processing Engine</span>
                <input
                  type="text"
                  readOnly
                  value="PyMuPDF + OpenCV + Heuristic Anchor AI"
                  className="w-full p-2 bg-white border border-slate-300 rounded font-mono text-slate-700"
                />
                <p className="text-[11px] text-slate-400">Statutory GST & PO matching active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
