import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  ShieldCheck,
  Eye,
  RefreshCw
} from 'lucide-react';
import { invoiceApi } from '../services/api';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<any>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    setProcessedResult(null);

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setUploadError(`Invalid file type (${ext}). Please upload a PDF, PNG, JPG, or JPEG.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB maximum upload limit.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(15);
    setCurrentStep('Saving file to secure storage and creating invoice record...');
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Step simulator animation
      setTimeout(() => { setUploadProgress(35); setCurrentStep('Executing PyMuPDF / OpenCV document text and geometry extraction...'); }, 500);
      setTimeout(() => { setUploadProgress(65); setCurrentStep('AI structured parsing: Vendor, GSTIN, line items & calculating field confidences...'); }, 1200);
      setTimeout(() => { setUploadProgress(85); setCurrentStep('Running 8-point Business Validation & Independent Fraud Risk Engine...'); }, 2000);

      const res = await invoiceApi.upload(formData);

      setUploadProgress(100);
      setCurrentStep('Cryptographic JSON snapshot created & n8n webhook dispatched!');
      setProcessedResult(res.data);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Document processing failed. Please check file formatting.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Invoice Ingestion & Document Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Accepts PDF, JPG, and PNG documents. Automated OCR text extraction, business rule validation, and AI fraud risk analysis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Max Limit: 25MB
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative bg-white ${
              dragActive
                ? 'border-teal-500 bg-teal-50/40 ring-4 ring-teal-500/10'
                : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileInput}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8 text-teal-600 animate-pulse" />
            </div>

            <h3 className="text-base font-bold text-slate-800">
              {selectedFile ? selectedFile.name : 'Choose an invoice or drag it here'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB - Ready for straight-through processing`
                : 'Supported file types: PDF, JPG, JPEG, PNG. Clean scans and digital PDFs yield highest confidence.'}
            </p>

            <div className="flex items-center gap-2 mt-4">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                PDF Document
              </span>
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                PNG / JPG Image
              </span>
            </div>
          </div>

          {/* Action and Progress Bar */}
          {selectedFile && !processedResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 font-bold text-xs uppercase">
                    {selectedFile.name.split('.').pop()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{selectedFile.name}</h4>
                    <span className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <button
                  onClick={handleUploadAndProcess}
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{isUploading ? 'Processing Document...' : 'Start Extraction & Validation'}</span>
                </button>
              </div>

              {isUploading && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-700">{currentStep}</span>
                    <span className="font-bold text-slate-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {uploadError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Processed Success Card */}
          {processedResult && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Processing Complete: Invoice {processedResult.invoice_id}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Invoice #{processedResult.invoice_number || 'N/A'} • {processedResult.supplier_name || 'Vendor'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Total Invoiced</span>
                  <p className="text-lg font-bold text-slate-800">
                    ₹{processedResult.total_amount ? processedResult.total_amount.toLocaleString('en-IN') : '0.00'}
                  </p>
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Extraction Confidence</span>
                  <p className="text-sm font-bold text-teal-600">{processedResult.confidence}%</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Validation Status</span>
                  <p className={`text-sm font-bold ${processedResult.validation_status === 'PASSED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {processedResult.validation_status}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Fraud Risk Category</span>
                  <p className={`text-sm font-bold ${processedResult.fraud_status === 'LOW' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {processedResult.fraud_status} RISK
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setProcessedResult(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Upload Another
                </button>
                <button
                  onClick={() => navigate(`/extraction?invoiceId=${processedResult.invoice_id}`)}
                  className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                >
                  <span>Review Extracted Fields</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Pipeline Workflow Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Straight-Through Processing Pipeline</h3>
            <ol className="space-y-4 relative border-l border-slate-200 ml-3">
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">1</span>
                <h4 className="text-xs font-bold text-slate-800">Document Preprocessing</h4>
                <p className="text-[11px] text-slate-400">Resolution normalization, grayscale & thresholding.</p>
              </li>
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">2</span>
                <h4 className="text-xs font-bold text-slate-800">PyMuPDF / OCR Extraction</h4>
                <p className="text-[11px] text-slate-400">Extracts spatial text blocks, bounding geometry & characters.</p>
              </li>
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">3</span>
                <h4 className="text-xs font-bold text-slate-800">AI Structured Parser</h4>
                <p className="text-[11px] text-slate-400">Maps fields (GSTIN, PO, line items, taxes, totals) with 0-100% confidence.</p>
              </li>
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">4</span>
                <h4 className="text-xs font-bold text-slate-800">8-Rule Business Validation</h4>
                <p className="text-[11px] text-slate-400">Reconciles PO, checks arithmetic, GSTIN structure, and duplicate entries.</p>
              </li>
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">5</span>
                <h4 className="text-xs font-bold text-slate-800">Independent Fraud Risk Engine</h4>
                <p className="text-[11px] text-slate-400">Analyzes anomalies, pricing outliers, and calculates risk score.</p>
              </li>
              <li className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold">6</span>
                <h4 className="text-xs font-bold text-slate-800">Immutable Hash Snapshot & n8n</h4>
                <p className="text-[11px] text-slate-400">SHA-256 integrity seal, chained audit log, and webhook orchestration.</p>
              </li>
            </ol>
          </div>

          {/* Quick Preview Card */}
          {filePreviewUrl && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs font-bold text-slate-700 block mb-2">Image Preview</span>
              <img
                src={filePreviewUrl}
                alt="Invoice Preview"
                className="w-full max-h-56 object-contain rounded-lg border border-slate-100 bg-slate-50"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
