/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  FileText, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Download, 
  ArrowLeft,
  Send,
  Trash2
} from 'lucide-react';
import { MINGGU_DATA, KUMPULAN_DATA, PEMANTAUAN_ITEMS, PEMANTAUAN_DAYS, RATING_OPTIONS } from './data';
import { Button } from './components/Button';
import { SignaturePad } from './components/SignaturePad';
import html2pdf from 'html2pdf.js';

type Step = 'selection' | 'form' | 'preview' | 'list';

interface ReportData {
  id?: number;
  mingguId: number;
  kumpulanId: number;
  ucapanPentadbir: string;
  ucapanGuruBertugas: string;
  lainLainMaklumat: string;
  lawatan: string;
  kokurikulum: string;
  catatanLain: string;
  pemantauan: Record<string, Record<string, string>>;
  disediakanOleh: string;
  signature: string;
  createdAt?: string;
}

export default function App() {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFoVhO5XG5vaCNW87Ba_4I6dVUelAMre17nR4hn4jU918B5co2BmNy5AAJa9mQDvc/exec';
  const [step, setStep] = useState<Step>('selection');
  const [mingguId, setMingguId] = useState<number>(0);
  const [kumpulanId, setKumpulanId] = useState<number>(0);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [logoBase64, setLogoBase64] = useState<string>('https://i.postimg.cc/c4WTczxt/Logo-SKSA.png');
  const [reportData, setReportData] = useState<ReportData>({
    mingguId: 0,
    kumpulanId: 0,
    ucapanPentadbir: '',
    ucapanGuruBertugas: '',
    lainLainMaklumat: '',
    lawatan: '',
    kokurikulum: '',
    catatanLain: '',
    pemantauan: {},
    disediakanOleh: '',
    signature: '',
  });

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReports();
    // Pre-load logo to avoid CORS issues during PDF generation
    fetch('https://i.postimg.cc/c4WTczxt/Logo-SKSA.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error("Failed to pre-load logo", err));
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=list`);
      if (!res.ok) throw new Error("Failed to fetch");

      const result = await res.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Gagal ambil data laporan');
      }

      setReports(
        result.data.map((r: any) => ({
          ...r.data,
          id: r.id,
          createdAt: r.createdAt
        }))
      );
    } catch (error) {
      console.error("Failed to fetch reports", error);
    }
  };

  const handleStartForm = () => {
    if (mingguId && kumpulanId) {
      setReportData({
        mingguId,
        kumpulanId,
        ucapanPentadbir: '',
        ucapanGuruBertugas: '',
        lainLainMaklumat: '',
        lawatan: '',
        kokurikulum: '',
        catatanLain: '',
        pemantauan: {},
        disediakanOleh: '',
        signature: '',
      });
      setStep('form');
    }
  };

  const handlePemantauanChange = (day: string, item: string, value: string) => {
    setReportData(prev => ({
      ...prev,
      pemantauan: {
        ...prev.pemantauan,
        [day]: {
          ...(prev.pemantauan[day] || {}),
          [item]: value
        }
      }
    }));
  };

  const handleHantarPelaporan = async () => {
    if (!reportRef.current) return;

    setLoading(true);
    setLoadingText("Menyimpan data...");

    try {
      const localRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'create',
          mingguId: reportData.mingguId,
          kumpulanId: reportData.kumpulanId,
          data: reportData
        })
      });

      if (!localRes.ok) throw new Error("Gagal simpan ke Google Sheet");

      const result = await localRes.json();
      if (result.status !== 'success') {
        throw new Error(result.message || "Gagal menghantar laporan");
      }

      alert("Laporan telah berjaya disimpan!");
      await fetchReports();
      setStep('list');
    } catch (error) {
      console.error("Submission error:", error);
      alert("Ralat: " + (error instanceof Error ? error.message : "Gagal menghantar laporan"));
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showStatus, setShowStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleDeleteReport = async (id: number) => {
    setLoading(true);
    setLoadingText("Memadam laporan...");

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });

      if (!response.ok) {
        throw new Error("Gagal memadam laporan");
      }

      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || "Gagal memadam laporan");
      }

      setShowStatus({ message: "Laporan berjaya dipadam.", type: 'success' });
      setReports(prev => prev.filter(r => Number(r.id) !== id));
      await fetchReports();
    } catch (error) {
      setShowStatus({ message: "Gagal memadam laporan.", type: 'error' });
    } finally {
      setLoading(false);
      setLoadingText("");
      setDeleteConfirmId(null);
      setTimeout(() => setShowStatus(null), 3000);
    }
  };

  const handleDownloadDirect = (report: ReportData) => {
    setReportData(report);
    // Beri masa untuk state update dan DOM render
    setTimeout(() => {
      handleDownloadPDF();
    }, 500);
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    
    const element = reportRef.current;
    const fileName = `LAPORAN_M${reportData.mingguId}_K${reportData.kumpulanId}.pdf`;
    
    // Set a temporary attribute to trigger safe CSS
    element.setAttribute('data-pdf-mode', 'true');

    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { 
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: true,
        allowTaint: true,
        scrollY: 0,
        scrollX: 0,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['avoid-all'] }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save().then(() => {
      element.removeAttribute('data-pdf-mode');
    });
  };

  const viewReport = (report: ReportData) => {
    setReportData(report);
    setStep('preview');
  };

  const selectedMinggu = MINGGU_DATA.find(m => m.id === reportData.mingguId);
  const selectedKumpulan = KUMPULAN_DATA.find(k => k.id === reportData.kumpulanId);

  return (
    <div className="min-h-screen pb-20">
      {/* Header Section */}
      <header className="bg-white border-bottom border-slate-200 py-8 px-4 mb-8">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <img 
            src={logoBase64} 
            alt="Logo SKSA" 
            className="h-24 mb-4"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
            Laporan Guru Bertugas Mingguan 2026
          </h1>
          <h2 className="text-lg font-medium text-emerald-600 uppercase mt-1">
            Unit HEM SK Sungai Abong
          </h2>
          <div className="mt-4 flex gap-2 no-print">
            <Button variant="ghost" size="sm" onClick={() => setStep('selection')}>
              Halaman Utama
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { fetchReports(); setStep('list'); }}>
              Lihat Semua Laporan
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {step === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 uppercase">Senarai Laporan</h3>
                <Button onClick={() => setStep('selection')} size="sm">
                  Buat Laporan Baru
                </Button>
              </div>
              <div className="grid gap-4">
                {reports.length === 0 ? (
                  <p className="text-center py-12 text-slate-500 italic">Tiada laporan dijumpai.</p>
                ) : (
                  reports.map((report) => (
                    <div 
                      key={report.id} 
                      className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => viewReport(report)}>
                        <div className="bg-emerald-100 p-2 rounded-lg">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">MINGGU {report.mingguId}</p>
                          <p className="text-xs text-slate-500">Kumpulan {report.kumpulanId} • {report.createdAt ? new Date(report.createdAt).toLocaleDateString('ms-MY') : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDirect(report);
                          }}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteConfirmId(Number(report.id));
                          }}
                          className="p-3 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center cursor-pointer relative z-40"
                          title="Padam Laporan"
                        >
                          <Trash2 className="w-6 h-6 pointer-events-none" />
                        </button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            viewReport(report);
                          }}
                        >
                          Lihat
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
            >
              <div className="grid gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <Calendar className="w-4 h-4" /> Pilih Minggu
                  </label>
                  <div className="relative">
                    <select
                      value={mingguId}
                      onChange={(e) => setMingguId(Number(e.target.value))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value={0}>Sila pilih minggu...</option>
                      {MINGGU_DATA.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    <Users className="w-4 h-4" /> Pilih Kumpulan Bertugas
                  </label>
                  <div className="relative">
                    <select
                      value={kumpulanId}
                      onChange={(e) => setKumpulanId(Number(e.target.value))}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value={0}>Sila pilih kumpulan...</option>
                      {KUMPULAN_DATA.map((k) => (
                        <option key={k.id} value={k.id}>
                          KUMPULAN {k.id}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <Button
                  onClick={handleStartForm}
                  disabled={!mingguId || !kumpulanId}
                  className="w-full py-4 text-lg"
                >
                  Mula Mengisi Laporan
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Minggu</p>
                    <p className="font-semibold">{selectedMinggu?.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase">Kumpulan</p>
                    <p className="font-semibold">KUMPULAN {kumpulanId}</p>
                  </div>
                </div>
              </div>

              {/* Section: Perhimpunan */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                  <h3 className="font-bold text-emerald-800 uppercase tracking-wide">Perhimpunan / Aktiviti Pagi</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">UCAPAN PENTADBIR</label>
                    <textarea
                      value={reportData.ucapanPentadbir}
                      onChange={(e) => setReportData(prev => ({ ...prev, ucapanPentadbir: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">UCAPAN GURU BERTUGAS</label>
                    <textarea
                      value={reportData.ucapanGuruBertugas}
                      onChange={(e) => setReportData(prev => ({ ...prev, ucapanGuruBertugas: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">LAIN-LAIN MAKLUMAN</label>
                    <textarea
                      value={reportData.lainLainMaklumat}
                      onChange={(e) => setReportData(prev => ({ ...prev, lainLainMaklumat: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                </div>
              </section>

              {/* Section: Catatan Peristiwa */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <h3 className="font-bold text-blue-800 uppercase tracking-wide">Catatan Peristiwa Penting Semasa</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">LAWATAN</label>
                    <textarea
                      value={reportData.lawatan}
                      onChange={(e) => setReportData(prev => ({ ...prev, lawatan: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">KOKURIKULUM</label>
                    <textarea
                      value={reportData.kokurikulum}
                      onChange={(e) => setReportData(prev => ({ ...prev, kokurikulum: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">LAIN-LAIN</label>
                    <textarea
                      value={reportData.catatanLain}
                      onChange={(e) => setReportData(prev => ({ ...prev, catatanLain: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Masukkan maklumat..."
                    />
                  </div>
                </div>
              </section>

              {/* Section: Pemantauan */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
                  <h3 className="font-bold text-amber-800 uppercase tracking-wide">Pemantauan</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border border-slate-200 bg-slate-50 text-left text-xs font-bold text-slate-600">ITEM</th>
                        {PEMANTAUAN_DAYS.map(day => (
                          <th key={day} className="p-2 border border-slate-200 bg-slate-50 text-center text-xs font-bold text-slate-600">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PEMANTAUAN_ITEMS.map(item => (
                        <tr key={item}>
                          <td className="p-2 border border-slate-200 text-xs font-medium text-slate-700">{item}</td>
                          {PEMANTAUAN_DAYS.map(day => (
                            <td key={`${day}-${item}`} className="p-1 border border-slate-200">
                              <select
                                value={reportData.pemantauan[day]?.[item] || ''}
                                onChange={(e) => handlePemantauanChange(day, item, e.target.value)}
                                className="w-full text-[10px] p-1 bg-transparent outline-none focus:bg-amber-50"
                              >
                                <option value="">-</option>
                                {RATING_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section: Signature */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wide">Disediakan Oleh</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">PILIH NAMA GURU</label>
                    <div className="relative">
                      <select
                        value={reportData.disediakanOleh}
                        onChange={(e) => setReportData(prev => ({ ...prev, disediakanOleh: e.target.value }))}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      >
                        <option value="">Sila pilih nama anda...</option>
                        {selectedKumpulan?.members.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">TANDATANGAN</label>
                    <SignaturePad 
                      onSave={(data) => setReportData(prev => ({ ...prev, signature: data }))}
                      onClear={() => setReportData(prev => ({ ...prev, signature: '' }))}
                    />
                  </div>
                </div>
              </section>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep('selection')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
                </Button>
                <Button onClick={() => setStep('preview')} className="flex-1">
                  Lihat Paparan Laporan <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex gap-4 no-print">
                <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Edit Semula
                </Button>
                <Button 
                  onClick={handleHantarPelaporan} 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  {loading ? (loadingText || "Menghantar...") : "SIMPAN PELAPORAN"} <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* PDF Layout - Always rendered but hidden if not in preview */}
        <div 
          style={step === 'preview' ? { marginTop: '32px' } : { position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
        >
      <div 
        ref={reportRef} 
        style={{ 
          width: '210mm', 
          height: '296mm', 
          padding: '12mm', 
          margin: '0 auto', 
          backgroundColor: '#ffffff', 
          color: '#000000', 
          fontFamily: 'Arial, sans-serif', 
          overflow: 'hidden', 
          position: 'relative', 
          display: 'block',
          boxSizing: 'border-box',
          lineHeight: '1.5'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '2px solid #000000' }}>
          <img 
            src={logoBase64} 
            alt="Logo SKSA" 
            style={{ height: '48px', marginBottom: '6px', display: 'inline-block' }}
            referrerPolicy="no-referrer"
          />
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0', letterSpacing: '0.5px' }}>LAPORAN GURU BERTUGAS MINGGUAN 2026</h1>
          <h2 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '4px 0 0 0', color: '#059669' }}>UNIT HEM SK SUNGAI ABONG</h2>
          
          <table style={{ width: '100%', marginTop: '12px', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td style={{ border: '1.5px solid #000000', padding: '6px', backgroundColor: '#f9fafb', width: '40%', verticalAlign: 'top' }}>
                  <p style={{ margin: '0' }}><strong>MINGGU:</strong> {selectedMinggu?.id}</p>
                  <p style={{ margin: '4px 0 0 0' }}><strong>TARIKH:</strong> {selectedMinggu?.dates}</p>
                </td>
                <td style={{ border: '1.5px solid #000000', padding: '6px', backgroundColor: '#f9fafb', verticalAlign: 'top' }}>
                  <p style={{ margin: '0' }}><strong>KUMPULAN BERTUGAS:</strong> {reportData.kumpulanId}</p>
                  <p style={{ margin: '4px 0 0 0', lineHeight: '1.3' }}><strong>GURU BERTUGAS:</strong> {KUMPULAN_DATA.find(k => k.id === reportData.kumpulanId)?.members.join(', ')}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Perhimpunan */}
          <div style={{ border: '1.5px solid #000000' }}>
            <div style={{ backgroundColor: '#e2e8f0', padding: '4px', borderBottom: '1.5px solid #000000', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>
              Perhimpunan / Aktiviti Pagi
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>UCAPAN PENTADBIR</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.ucapanPentadbir || '-'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>UCAPAN GURU BERTUGAS</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.ucapanGuruBertugas || '-'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>LAIN-LAIN MAKLUMAN</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.lainLainMaklumat || '-'}</p>
              </div>
            </div>
          </div>

          {/* Catatan Peristiwa */}
          <div style={{ border: '1.5px solid #000000' }}>
            <div style={{ backgroundColor: '#e2e8f0', padding: '4px', borderBottom: '1.5px solid #000000', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>
              Catatan Peristiwa Penting Semasa
            </div>
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>LAWATAN</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.lawatan || '-'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>KOKURIKULUM</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.kokurikulum || '-'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 'bold', textDecoration: 'underline', margin: '0', fontSize: '9px' }}>LAIN-LAIN</p>
                <p style={{ minHeight: '14px', whiteSpace: 'pre-wrap', margin: '4px 0 0 0', textAlign: 'justify', lineHeight: '1.4' }}>{reportData.catatanLain || '-'}</p>
              </div>
            </div>
          </div>

          {/* Pemantauan */}
          <div style={{ border: '1.5px solid #000000', marginTop: '5px' }}>
            <div style={{ backgroundColor: '#e2e8f0', padding: '5px', borderBottom: '1.5px solid #000000', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>
              Pemantauan Kebersihan & Disiplin
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ height: '28px' }}>
                  <th style={{ border: '1px solid #000000', padding: '0 8px', backgroundColor: '#f8fafc', textAlign: 'left', width: '35%', verticalAlign: 'middle' }}>ITEM PEMANTAUAN</th>
                  {PEMANTAUAN_DAYS.map(d => <th key={d} style={{ border: '1px solid #000000', padding: '0', backgroundColor: '#f8fafc', textAlign: 'center', verticalAlign: 'middle' }}>{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {PEMANTAUAN_ITEMS.map(item => (
                  <tr key={item} style={{ height: '24px' }}>
                    <td style={{ border: '1px solid #000000', padding: '0 8px', fontWeight: 'bold', verticalAlign: 'middle' }}>{item}</td>
                    {PEMANTAUAN_DAYS.map(day => (
                      <td key={`${day}-${item}`} style={{ border: '1px solid #000000', padding: '0', textAlign: 'center', verticalAlign: 'middle' }}>
                        {reportData.pemantauan[day]?.[item] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '50px', marginTop: 'auto', padding: '15px 0', fontSize: '11px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontWeight: 'bold', margin: '0' }}>DISEDIAKAN OLEH:</p>
              <div style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fcfcfc', overflow: 'hidden' }}>
                {reportData.signature ? (
                  <img 
                    src={reportData.signature} 
                    alt="Signature" 
                    style={{ 
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '45px',
                      height: '45px',
                      width: 'auto',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#94a3b8' }}>Tiada Tandatangan</span>
                )}
              </div>
              <div style={{ borderTop: '1.5px solid #000000', paddingTop: '5px' }}>
                <p style={{ margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>{reportData.disediakanOleh || '................................................'}</p>
                <p style={{ fontSize: '10px', marginTop: '2px', fontStyle: 'italic', margin: '0' }}>Guru Bertugas Mingguan</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontWeight: 'bold', margin: '0' }}>DISAHKAN OLEH:</p>
              <div style={{ height: '55px' }}></div>
              <div style={{ borderTop: '1.5px solid #000000', paddingTop: '5px' }}>
                <p style={{ margin: '0' }}>( ................................................ )</p>
                <p style={{ fontSize: '10px', marginTop: '2px', fontStyle: 'italic', margin: '0' }}>Pentadbir Sekolah</p>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      </main>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 uppercase">Padam Laporan?</h3>
                <p className="text-slate-600 mb-6">
                  Adakah anda pasti mahu padam laporan ini? Tindakan ini tidak boleh diundur.
                </p>
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => setDeleteConfirmId(null)}
                    disabled={loading}
                  >
                    Batal
                  </Button>
                  <Button 
                    variant="danger" 
                    className="flex-1" 
                    onClick={() => handleDeleteReport(deleteConfirmId)}
                    disabled={loading}
                  >
                    {loading ? "Memadam..." : "Ya, Padam"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Toast */}
      <AnimatePresence>
        {showStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-full shadow-lg flex items-center gap-2 border ${
              showStatus.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'
            }`}
          >
            {showStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            <span className="font-medium">{showStatus.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Bar for Selection */}
      {step === 'selection' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          <div className="bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                <p className="text-sm font-medium">Sedia untuk melapor</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase">Tahun</p>
              <p className="text-sm font-medium">2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
