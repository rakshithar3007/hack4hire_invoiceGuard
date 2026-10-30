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
  RefreshCw,
  X
} from 'lucide-react';
import { invoiceApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { formatINR } from '../utils/formatters';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [isServerProcessing, setIsServerProcessing] = useState<boolean>(false);

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
      setUploadError(`Unsupported file format '${ext}'. Accepted formats: PDF, PNG, JPG, JPEG.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB maximum upload limit.');
      return;
    }

    if (file.size < 30) {
      setUploadError('File is empty or corrupted (under 30 bytes).');
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
    setUploadPercent(0);
    setIsServerProcessing(false);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Use real upload progress from XMLHttpRequest/Axios
      const res = await invoiceApi.upload(formData);

      setIsServerProcessing(false);
      setUploadPercent(100);
      setProcessedResult(res.data);
      toast.success('Invoice Processed', `Invoice ${res.data.invoice_id} successfully extracted and audited.`);
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Document upload and processing failed. Please check the file.');
      toast.error('Upload Failed', err.response?.data?.detail || 'Processing failed.');
    } finally {
      setIsUploading(false);
      setIsServerProcessing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <UploadCloud size={16} className="text-[#2457A6]" />
            <span>Invoice Ingestion & Document Processing</span>
          </h1>
          <p className="text-xs text-[#697386]">
            Upload vendor invoices for automated OCR extraction, 8-point rule verification, and fraud scoring.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#697386]">
          <span className="px-2 py-0.5 rounded-[4px] bg-[#F7F8FA] border border-[#E4E8EF] font-mono">PDF</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#F7F8FA] border border-[#E4E8EF] font-mono">PNG</span>
          <span className="px-2 py-0.5 rounded-[4px] bg-[#F7F8FA] border border-[#E4E8EF] font-mono">JPG</span>
          <span className="font-semibold text-[#172033]">Max 25MB</span>
        </div>
      </div>

      {/* Main Upload Box */}
      <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-[6px] p-8 text-center transition-colors relative ${
            dragActive
              ? 'border-[#2457A6] bg-[#2457A6]/5'
              : 'border-[#E4E8EF] hover:border-[#2457A6]/60 bg-[#F7F8FA]/60'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="w-12 h-12 rounded-[6px] bg-white border border-[#E4E8EF] text-[#2457A6] mx-auto flex items-center justify-center mb-3 shadow-xs">
            <UploadCloud size={22} />
          </div>

          <h3 className="text-xs font-bold text-[#172033]">
            {selectedFile ? selectedFile.name : 'Drag and drop invoice document here, or browse files'}
          </h3>
          <p className="text-[11px] text-[#697386] mt-1">
            Accepts official tax invoices in PDF, PNG, or JPG formats.
          </p>

          {selectedFile && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-[4px] bg-white border border-[#E4E8EF] text-xs font-mono text-[#172033]">
              <FileText size={13} className="text-[#2457A6]" />
              <span>{selectedFile.name}</span>
              <span className="text-[#697386]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setProcessedResult(null);
                }}
                className="text-[#697386] hover:text-[#C34A4A] p-0.5"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {uploadError && (
          <div className="p-3 rounded-[4px] border border-[#C34A4A]/30 bg-[#fdf1f1] text-xs text-[#C34A4A] flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Real Upload & Processing Status Bar */}
        {isUploading && (
          <div className="p-4 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#172033] flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-[#2457A6]" />
                Processing document through OCR, AI Extraction & Fraud Engine...
              </span>
              <span className="font-mono text-[#697386] tabular-nums">In Progress</span>
            </div>
            <div className="w-full h-1.5 bg-[#EEF1F6] rounded-full overflow-hidden">
              <div className="h-full bg-[#2457A6] rounded-full animate-pulse w-full" />
            </div>
            <p className="text-[11px] text-[#697386]">
              Parsing layout bounding boxes, comparing with supplier master data, and calculating field confidences.
            </p>
          </div>
        )}

        {/* Success Card */}
        {processedResult && (
          <div className="p-4 rounded-[4px] border border-[#21845B]/30 bg-[#edf7f2] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#21845B] font-bold text-xs">
                <CheckCircle2 size={16} />
                <span>Invoice Ingestion Completed</span>
              </div>
              <span className="font-mono font-bold text-xs text-[#172033]">{processedResult.invoice_id}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div className="p-2 rounded bg-white border border-[#E4E8EF]">
                <span className="text-[10px] text-[#697386] block">Invoice No</span>
                <span className="font-mono font-bold text-[#172033]">{processedResult.invoice_number || 'N/A'}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E4E8EF]">
                <span className="text-[10px] text-[#697386] block">Supplier</span>
                <span className="font-medium text-[#172033] truncate block">{processedResult.supplier_name || '—'}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E4E8EF]">
                <span className="text-[10px] text-[#697386] block">Total Amount</span>
                <span className="font-mono font-bold text-[#172033]">{formatINR(processedResult.total_amount)}</span>
              </div>
              <div className="p-2 rounded bg-white border border-[#E4E8EF]">
                <span className="text-[10px] text-[#697386] block">Validation</span>
                <StatusBadge status={processedResult.validation_status} size="sm" />
              </div>
            </div>

            <div className="pt-2 border-t border-[#21845B]/20 flex justify-end">
              <button
                type="button"
                onClick={() => navigate(`/extraction?invoiceId=${processedResult.invoice_id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#2457A6] text-white hover:bg-[#1c4482] cursor-pointer text-xs font-semibold"
              >
                <span>Open in Review Split-Pane</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!processedResult && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!selectedFile || isUploading}
              onClick={handleUploadAndProcess}
              className="px-4 py-2 text-xs font-semibold rounded-[4px] bg-[#2457A6] text-white hover:bg-[#1c4482] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Processing Document...' : 'Upload & Process Invoice'}
            </button>
          </div>
        )}
      </div>

      {/* Render Free Storage Ephemeral Disclosure */}
      <div className="p-3 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA] text-[11px] text-[#697386] flex items-start gap-2">
        <Clock size={14} className="shrink-0 mt-0.5 text-[#2457A6]" />
        <div>
          <strong className="text-[#172033]">Hosting Disclosure:</strong> Files uploaded during the demo session are stored temporarily in the application storage volume. On free cloud hosts (Render Free), ephemeral disk storage recycles upon service inactivity restarts.
        </div>
      </div>
    </div>
  );
};
