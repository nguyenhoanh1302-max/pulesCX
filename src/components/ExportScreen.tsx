import { useMemo, useState } from 'react';
import { Download, FileJson, Printer } from 'lucide-react';
import type {
  AggregateAIReport,
  DomainChannel,
  SurveyResponse,
} from '../types/survey';
import {
  CHANNEL_META,
  computeMetrics,
  filterResponses,
  formatDateVi,
  formatDurationVietnamese,
  SENTIMENT_LABELS,
} from '../utils/surveyHelpers';

interface ExportScreenProps {
  responses: SurveyResponse[];
  aggregateReport: AggregateAIReport | null;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ExportScreen({ responses, aggregateReport }: ExportScreenProps) {
  const [days, setDays] = useState<'all' | '7' | '30' | '90'>('30');
  const [channel, setChannel] = useState<'all' | DomainChannel>('all');
  const [reportTitle, setReportTitle] = useState(
    'Báo cáo Đánh giá Mức độ Hài lòng Khách hàng'
  );
  const [preparedBy, setPreparedBy] = useState('Phòng Quản trị Chất lượng & CX');
  const [includeAi, setIncludeAi] = useState(true);
  const [includeVerbatim, setIncludeVerbatim] = useState(true);

  const filtered = useMemo(
    () => filterResponses(responses, { days, channel }),
    [responses, days, channel]
  );

  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  const handleDownloadCsv = () => {
    const headers = [
      'Ma phan hoi',
      'Ngay gui',
      'Linh vuc',
      'Nhom khach hang',
      'Thoi gian hoan thanh (giay)',
      'CSAT (1-5)',
      'NPS (0-10)',
      'Toc do',
      'Chat luong',
      'Trai nghiem',
      'Nhan vien',
      'Diem hai long (Cau mo)',
      'Gop y cai thien (Cau mo)',
      'Sac thai AI',
      'Chu de AI',
      'Tom tat AI',
    ];

    const rows = filtered.map((r) => [
      r.id,
      formatDateVi(r.createdAt),
      CHANNEL_META[r.channel].label,
      r.customerSegment,
      r.completionSeconds,
      r.csat,
      r.nps,
      r.aspectScores.speed,
      r.aspectScores.quality,
      r.aspectScores.experience,
      r.aspectScores.staff,
      r.positiveFeedback,
      r.improvementFeedback,
      r.aiAnalysis ? SENTIMENT_LABELS[r.aiAnalysis.sentiment] : 'Chưa phân tích',
      r.aiAnalysis ? r.aiAnalysis.themes.join('; ') : '',
      r.aiAnalysis ? r.aiAnalysis.summary : '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-hai-long-khach-hang-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const payload = {
      reportTitle,
      preparedBy,
      exportedAt: new Date().toISOString(),
      filter: { days, channel },
      metrics,
      aggregateAIReport: includeAi ? aggregateReport : null,
      responses: includeVerbatim ? filtered : [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pulsecx-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="no-print border-b border-slate-200 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Xuất báo cáo quản trị
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Tùy chỉnh phạm vi dữ liệu, xem trước tài liệu báo cáo và xuất trực tiếp ra CSV (Excel), JSON hoặc bản in PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Builder Panel */}
        <aside className="no-print lg:col-span-4 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Cấu hình nội dung báo cáo
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Tiêu đề báo cáo
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Đơn vị lập báo cáo
              </label>
              <input
                type="text"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Khoảng thời gian
                </label>
                <select
                  value={days}
                  onChange={(e) =>
                    setDays(e.target.value as 'all' | '7' | '30' | '90')
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none min-h-[40px]"
                >
                  <option value="7">7 ngày qua</option>
                  <option value="30">30 ngày qua</option>
                  <option value="90">90 ngày qua</option>
                  <option value="all">Toàn thời gian</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lĩnh vực
                </label>
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as 'all' | DomainChannel)
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none min-h-[40px]"
                >
                  <option value="all">Tất cả lĩnh vực</option>
                  {(Object.keys(CHANNEL_META) as DomainChannel[]).map((ch) => (
                    <option key={ch} value={ch}>
                      {CHANNEL_META[ch].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeAi}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>Bao gồm tóm tắt &amp; chủ đề AI</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeVerbatim}
                  onChange={(e) => setIncludeVerbatim(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>Bao gồm bảng trích yếu phản hồi</span>
              </label>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2.5">
            <h2 className="text-sm font-bold text-slate-900">
              Tải xuống hoặc In báo cáo
            </h2>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filtered.length === 0}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300 min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              <span>Tải CSV cho Excel ({filtered.length} dòng)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white hover:bg-slate-800 min-h-[44px]"
            >
              <Printer className="h-4 w-4" />
              <span>In / Lưu thành PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="cursor-pointer w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
            >
              <FileJson className="h-4 w-4" />
              <span>Tải dữ liệu cấu trúc JSON</span>
            </button>
          </div>
        </aside>

        {/* Right Live Document Preview */}
        <section className="lg:col-span-8">
          <div className="print-only-container rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 space-y-8">
            {/* Document Masthead */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>PulseCX · Báo cáo Trải nghiệm Khách hàng</span>
                <span className="tabular-nums">
                  Ngày lập: {formatDateVi(new Date().toISOString())}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                {reportTitle}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Đơn vị: {preparedBy}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Phạm vi:{' '}
                  {channel === 'all'
                    ? 'Tất cả lĩnh vực'
                    : CHANNEL_META[channel].label}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Kỳ dữ liệu:{' '}
                  {days === 'all' ? 'Toàn thời gian' : `${days} ngày gần nhất`}
                </span>
              </div>
            </div>

            {/* Executive KPI Table */}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Chỉ số hiệu suất tổng quan
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl border border-slate-200 p-4 tabular-nums">
                <div>
                  <p className="text-xs text-slate-500">Số phản hồi</p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                    {metrics.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CSAT Trung bình</p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                    {metrics.avgCsat.toFixed(2)} / 5.0
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Chỉ số NPS</p>
                  <p className="mt-1 font-mono text-xl font-bold text-slate-900">
                    {metrics.npsScore > 0 ? `+${metrics.npsScore}` : metrics.npsScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Thời gian TB</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {formatDurationVietnamese(metrics.avgCompletionSeconds)}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Insights Preview */}
            {includeAi && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Tóm tắt phản hồi dài &amp; Chủ đề trọng tâm (AI)
                </h3>
                {aggregateReport ? (
                  <div className="mt-3 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-700">
                      {aggregateReport.executiveSummary}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                            <th className="py-2.5 px-3">Chủ đề thường gặp</th>
                            <th className="py-2.5 px-3 text-right">Số lượt</th>
                            <th className="py-2.5 px-3">Sắc thái</th>
                            <th className="py-2.5 px-3">Bộ phận phụ trách</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {aggregateReport.recurringThemes.map((t) => (
                            <tr key={t.theme}>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {t.theme}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                {t.count}
                              </td>
                              <td className="py-2.5 px-3">
                                {SENTIMENT_LABELS[t.sentiment]}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {t.department}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Chưa có bản tổng hợp AI. Bạn có thể vào mục &ldquo;Thống kê&rdquo; và nhấn &ldquo;Tổng hợp chủ đề bằng AI&rdquo; để đính kèm nhận định tự động vào báo cáo.
                  </p>
                )}
              </div>
            )}

            {/* Verbatim Table */}
            {includeVerbatim && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {includeAi ? '3.' : '2.'} Trích yếu phản hồi khách hàng gần nhất (
                  {Math.min(filtered.length, 10)}/{filtered.length} mẫu)
                </h3>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-2.5 px-3">Mã</th>
                        <th className="py-2.5 px-3">Lĩnh vực</th>
                        <th className="py-2.5 px-3 text-right">CSAT</th>
                        <th className="py-2.5 px-3 text-right">NPS</th>
                        <th className="py-2.5 px-3">Tóm tắt / Góp ý chính</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                            {r.id}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {CHANNEL_META[r.channel].shortLabel}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {r.csat}/5
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {r.nps}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 leading-relaxed">
                            {r.aiAnalysis?.summary ||
                              r.improvementFeedback ||
                              r.positiveFeedback}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
