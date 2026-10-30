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
  FileCheck,
  ShieldAlert,
  Server
} from 'lucide-react';
import { n8nApi, supplierApi, poApi, invoiceApi } from '../services/api';
import { Invoice } from '../types';
import { formatINR } from '../utils/formatters';
import { useToast } from '../components/Toast';

export const SettingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'n8n' | 'suppliers' | 'pos' | 'system'>('n8n');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('INV-1001');
  const [simulationTrace, setSimulationTrace] = useState<any[] | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Suppliers & POs state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [newSupName, setNewSupName] = useState<string>('');
  const [newSupGstin, setNewSupGstin] = useState<string>('');
  const [newPoNumber, setNewPoNumber] = useState<string>('');
  const [newPoAmount, setNewPoAmount] = useState<string>('');
  const [newPoSupplierId, setNewPoSupplierId] = useState<number>(1);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [invRes, supRes, poRes] = await Promise.all([
          invoiceApi.getAll(),
          supplierApi.getAll(),
          poApi.getAll(),
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
      showToast('success', `Executed 8-node n8n simulation pipeline for ${selectedInvoiceId}.`);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Simulation execution failed.');
    } finally {
      setSimulating(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName || !newSupGstin) return;
    try {
      await supplierApi.create({ supplier_name: newSupName, gstin: newSupGstin });
      showToast('success', `Supplier '${newSupName}' added to master registry.`);
      setNewSupName('');
      setNewSupGstin('');
      const res = await supplierApi.getAll();
      setSuppliers(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to add supplier.');
    }
  };

  const handleAddPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoNumber || !newPoAmount) return;
    try {
      await poApi.create({
        po_number: newPoNumber,
        expected_amount: parseFloat(newPoAmount),
        supplier_id: newPoSupplierId,
      });
      showToast('success', `PO '${newPoNumber}' added to reconciliation table.`);
      setNewPoNumber('');
      setNewPoAmount('');
      const res = await poApi.getAll();
      setPos(res.data);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to add PO.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">System Configuration & Integrations</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)]">
              Admin Control
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Configure n8n automated webhooks, supplier master directories, purchase order three-way match tables, and runtime parameters.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="flex border-b border-[var(--border)] px-5 pt-3 gap-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('n8n')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'n8n'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>n8n Pipeline Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'suppliers'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Supplier Master ({suppliers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'pos'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Purchase Orders ({pos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>API & Architecture Config</span>
          </button>
        </div>

        {/* Tab 1: n8n Workflow Interactive Simulator */}
        {activeTab === 'n8n' && (
          <div className="p-5 space-y-5">
            <div className="bg-[var(--surface-sunken)] rounded-lg p-4 border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-[var(--accent)]" />
                  <span>8-Node n8n Workflow Simulator</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
                  Executes the exact webhook validation, AI summarization, and Gmail notification pipeline adapted from your n8n workflow.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white text-[var(--text-primary)] rounded border border-[var(--border)]"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.id} ({inv.invoice_number || 'No Num'})</option>
                  ))}
                </select>

                <button
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
                  <span>{simulating ? 'Running...' : 'Run Simulation'}</span>
                </button>
              </div>
            </div>

            {/* Visual Node Trace Cards */}
            <div className="p-4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border)]">
              <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-3">
                Pipeline Architecture Trace
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded border border-[var(--border)] shadow-2xs">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase block">Node 1</span>
                  <p className="font-semibold text-[var(--text-primary)]">Webhook Ingestion</p>
                  <span className="text-[10px] text-[var(--text-muted)]">FastAPI state trigger</span>
                </div>
                <div className="p-3 bg-white rounded border border-[var(--border)] shadow-2xs">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase block">Node 2 & 3</span>
                  <p className="font-semibold text-[var(--text-primary)]">Schema Validation</p>
                  <span className="text-[10px] text-[var(--text-muted)]">Payload sanity check</span>
                </div>
                <div className="p-3 bg-white rounded border border-[var(--border)] shadow-2xs">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase block">Node 4 & 5</span>
                  <p className="font-semibold text-[var(--text-primary)]">AI Anomaly Scorer</p>
                  <span className="text-[10px] text-[var(--text-muted)]">Multi-layer evaluation</span>
                </div>
                <div className="p-3 bg-white rounded border border-[var(--border)] shadow-2xs">
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase block">Node 6, 7 & 8</span>
                  <p className="font-semibold text-[var(--text-primary)]">AP Notifications</p>
                  <span className="text-[10px] text-[var(--text-muted)]">Gmail digest + ERP queue</span>
                </div>
              </div>
            </div>

            {/* Simulation Trace Log */}
            {simulationTrace && (
              <div className="space-y-2 animate-in fade-in">
                <span className="text-xs font-bold text-[var(--text-primary)] block">Execution Diagnostics Log:</span>
                {simulationTrace.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded bg-[var(--surface-sunken)] text-[var(--text-primary)] font-mono text-xs border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
                      <strong className="text-[var(--text-primary)]">{step.node}:</strong>
                      <span className="text-[var(--accent)] font-semibold">{step.status}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate max-w-lg">
                      {step.summary || (step.details ? JSON.stringify(step.details) : 'Executed cleanly.')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Supplier Master */}
        {activeTab === 'suppliers' && (
          <div className="p-5 space-y-5">
            <form onSubmit={handleAddSupplier} className="p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Tech Solutions"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">GSTIN Number (15 Digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={newSupGstin}
                  onChange={(e) => setNewSupGstin(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] uppercase font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded transition flex items-center justify-center gap-1.5 cursor-pointer h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Vendor</span>
              </button>
            </form>

            <div className="overflow-x-auto border border-[var(--border)] rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">GSTIN</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-sunken)] transition">
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">#{s.id}</td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">{s.supplier_name}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--accent)]">{s.gstin}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.contact_details || 'Verified Vendor'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-emerald-200">
                          REGISTERED
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
          <div className="p-5 space-y-5">
            <form onSubmit={handleAddPO} className="p-4 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border)] grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">PO Number</label>
                <input
                  type="text"
                  placeholder="e.g. PO-2026-9901"
                  value={newPoNumber}
                  onChange={(e) => setNewPoNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] uppercase font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">Authorized Vendor</label>
                <select
                  value={newPoSupplierId}
                  onChange={(e) => setNewPoSupplierId(parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">Expected Amount (INR)</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={newPoAmount}
                  onChange={(e) => setNewPoAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded transition flex items-center justify-center gap-1.5 cursor-pointer h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create PO</span>
              </button>
            </form>

            <div className="overflow-x-auto border border-[var(--border)] rounded">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">PO Number</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3 text-right">Expected Amount</th>
                    <th className="py-2.5 px-3 text-center">Reconciliation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pos.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--surface-sunken)] transition">
                      <td className="py-2.5 px-3 font-mono font-semibold text-[var(--text-primary)]">{p.po_number}</td>
                      <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{p.supplier_name}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[var(--text-primary)] tabular-nums">
                        {p.expected_amount != null ? formatINR(p.expected_amount) : '₹0'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--success-bg)] text-[var(--success)] border border-emerald-200">
                          {p.status || 'ACTIVE'}
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
          <div className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text-primary)] block">FastAPI Backend API Base</span>
                <input
                  type="text"
                  readOnly
                  value="https://invoiceguard-backend.onrender.com/api"
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded font-mono text-[var(--text-secondary)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Render Free deployment with automatic cold-start detection</p>
              </div>

              <div className="p-4 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text-primary)] block">Database Engine</span>
                <input
                  type="text"
                  readOnly
                  value="SQLite + SQLAlchemy 2.0 (Ephemeral on Render Free)"
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded font-mono text-[var(--text-secondary)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Zero cloud hosting costs, automated sample seed on startup</p>
              </div>

              <div className="p-4 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text-primary)] block">Cryptographic Audit Ledger</span>
                <input
                  type="text"
                  readOnly
                  value="SHA-256 Chained Hash Records"
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded font-mono text-[var(--text-secondary)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Immutable state mutation history recorded per transaction</p>
              </div>

              <div className="p-4 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
                <span className="font-bold text-[var(--text-primary)] block">Document Parsing Pipeline</span>
                <input
                  type="text"
                  readOnly
                  value="PyMuPDF + Computer Vision + Dual-Pass Independent Checker"
                  className="w-full px-2.5 py-1.5 bg-white border border-[var(--border)] rounded font-mono text-[var(--text-secondary)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">Zero hallucination confidence scoring with automated retry strategies</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
