import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  Link2,
  Loader2,
  MinusCircle,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DomainChannel,
  SentimentType,
  SurveyCampaignConfig,
  SurveyResponse,
} from '../types/survey';
import {
  CHANNEL_META,
  filterResponses,
  formatDateVi,
  formatDurationVietnamese,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
} from '../utils/surveyHelpers';

interface AdminScreenProps {
  config: SurveyCampaignConfig;
  responses: SurveyResponse[];
  onAnalyzeOne: (id: string) => Promise<void>;
  onAnalyzePending: () => Promise<number>;
  onDeleteOne: (id: string) => Promise<void>;
  onUpdateConfig: (partial: Partial<SurveyCampaignConfig>) => Promise<void>;
}

export function AdminScreen({
  config,
  responses,
  onAnalyzeOne,
  onAnalyzePending,
  onDeleteOne,
  onUpdateConfig,
}: AdminScreenProps) {
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'all' | DomainChannel>('all');
  const [sentiment, setSentiment] = useState<'all' | SentimentType>('all');
  const [days, setDays] = useState<'all' | '7' | '30' | '90'>('all');

  const [selectedItem, setSelectedItem] = useState<SurveyResponse | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [draftTitle, setDraftTitle] = useState(config.title);
  const [draftNote, setDraftNote] = useState(config.welcomeNote);
  const [draftMinutes, setDraftMinutes] = useState(config.estimatedMinutes);
  const [savingConfig, setSavingConfig] = useState(false);

  const [shareChannel, setShareChannel] = useState<'intro' | DomainChannel>('intro');
  const [copiedLink, setCopiedLink] = useState(false);

  const publicBaseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-pre-ncpphopdb2eqp6svsh2yq6-1010762460233.asia-east1.run.app';

  const generatedShareUrl =
    shareChannel === 'intro'
      ? `${publicBaseUrl}/?screen=intro`
      : `${publicBaseUrl}/?screen=questions&channel=${shareChannel}`;

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedShareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setActionError('Trình duyệt không hỗ trợ sao chép tự động, vui lòng bôi đen và copy.');
    }
  };

  const filtered = useMemo(
    () => filterResponses(responses, { days, channel, sentiment, search }),
    [responses, days, channel, sentiment, search]
  );

  const pendingCount = useMemo(
    () =>
      responses.filter(
        (r) => !r.aiAnalysis && (r.positiveFeedback || r.improvementFeedback)
      ).length,
    [responses]
  );

  const handleAnalyzeSingle = async (id: string) => {
    setAnalyzingId(id);
    setActionError(null);
    setActionMessage(null);
    try {
      await onAnalyzeOne(id);
      setActionMessage(`Đã hoàn tất phân tích AI cho mã ${id}.`);
      if (selectedItem?.id === id) {
        const refreshed = responses.find((r) => r.id === id);
        if (refreshed) setSelectedItem(refreshed);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Không thể phân tích AI.'
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleBatchAnalyze = async () => {
    setBatchLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await onAnalyzePending();
      setActionMessage(
        updated > 0
          ? `AI đã phân tích xong ${updated} phản hồi chưa xử lý.`
          : 'Tất cả phản hồi mở đều đã có kết quả phân tích AI.'
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Lỗi khi phân tích hàng loạt.'
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      await onDeleteOne(id);
      if (selectedItem?.id === id) setSelectedItem(null);
      setActionMessage(`Đã xóa phản hồi ${id}.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Không thể xóa phản hồi.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setActionError(null);
    try {
      await onUpdateConfig({
        title: draftTitle,
        welcomeNote: draftNote,
        estimatedMinutes: draftMinutes,
      });
      setShowConfigEditor(false);
      setActionMessage('Đã cập nhật cấu hình chiến dịch khảo sát.');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Không thể lưu cấu hình.'
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const currentModalItem = selectedItem
    ? responses.find((r) => r.id === selectedItem.id) ?? selectedItem
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header & Campaign Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản trị phản hồi khảo sát
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span>Tổng số: {responses.length} phản hồi</span>
            <span aria-hidden="true">·</span>
            <span>Chờ AI phân tích: {pendingCount}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800">
              Trạng thái: {config.isActive ? 'Đang mở tiếp nhận' : 'Đang tạm dừng'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onUpdateConfig({ isActive: !config.isActive })}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap shrink-0"
          >
            {config.isActive ? 'Tạm dừng khảo sát' : 'Mở lại khảo sát'}
          </button>

          <button
            type="button"
            onClick={() => {
              setDraftTitle(config.title);
              setDraftNote(config.welcomeNote);
              setDraftMinutes(config.estimatedMinutes);
              setShowConfigEditor((v) => !v);
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px] whitespace-nowrap shrink-0"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Cấu hình biểu mẫu</span>
          </button>

          <button
            type="button"
            onClick={handleBatchAnalyze}
            disabled={batchLoading}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-teal-600/60 min-h-[40px] whitespace-nowrap shrink-0"
          >
            {batchLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Đang phân tích AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Phân tích AI phản hồi mới ({pendingCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Public Survey Link Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <Link2 className="h-4 w-4 mt-0.5 text-teal-700 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Liên kết chia sẻ khảo sát cho khách hàng
              </h2>
              <p className="text-xs text-slate-500">
                Chọn điểm đến mặc định rồi sao chép đường dẫn gửi qua Zalo, Email hoặc QR tại quầy.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:min-w-[540px]">
            <select
              aria-label="Chọn trang đích khi chia sẻ"
              value={shareChannel}
              onChange={(e) =>
                setShareChannel(e.target.value as 'intro' | DomainChannel)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none min-h-[40px]"
            >
              <option value="intro">Trang giới thiệu khảo sát</option>
              <option value="ecommerce">Vào thẳng câu hỏi · TMĐT</option>
              <option value="cskh">Vào thẳng câu hỏi · CSKH</option>
              <option value="marketing">Vào thẳng câu hỏi · Marketing</option>
              <option value="quality">Vào thẳng câu hỏi · Chất lượng</option>
            </select>

            <input
              type="text"
              readOnly
              value={generatedShareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none min-h-[40px]"
            />

            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 min-h-[40px] whitespace-nowrap shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Sao chép link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Inline Campaign Config Editor */}
      {showConfigEditor && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Cấu hình trang giới thiệu &amp; thời gian ước tính
            </h2>
            <button
              type="button"
              onClick={() => setShowConfigEditor(false)}
              className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Đóng
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700">
                Tiêu đề chiến dịch khảo sát
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Thời gian dự kiến (phút)
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(Number(e.target.value) || 2)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-teal-700 focus:outline-none tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Lời giới thiệu cho khách hàng
            </label>
            <textarea
              rows={2}
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfigEditor(false)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[40px]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 min-h-[40px]"
            >
              {savingConfig ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </section>
      )}

      {/* Feedback Alerts */}
      {actionMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã, nội dung góp ý, chủ đề AI..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none min-h-[42px]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Lọc theo lĩnh vực"
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'all' | DomainChannel)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none min-h-[42px]"
            >
              <option value="all">Tất cả lĩnh vực</option>
              {(Object.keys(CHANNEL_META) as DomainChannel[]).map((ch) => (
                <option key={ch} value={ch}>
                  {CHANNEL_META[ch].label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Lọc theo sắc thái AI"
              value={sentiment}
              onChange={(e) =>
                setSentiment(e.target.value as 'all' | SentimentType)
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none min-h-[42px]"
            >
              <option value="all">Mọi sắc thái</option>
              <option value="positive">Tích cực</option>
              <option value="neutral">Trung lập</option>
              <option value="negative">Tiêu cực</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Lọc theo khoảng thời gian"
              value={days}
              onChange={(e) =>
                setDays(e.target.value as 'all' | '7' | '30' | '90')
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-teal-700 focus:outline-none min-h-[42px]"
            >
              <option value="all">Toàn thời gian</option>
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">90 ngày qua</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Mã · Ngày</th>
                <th className="py-3 px-4">Lĩnh vực</th>
                <th className="py-3 px-4 text-right">CSAT</th>
                <th className="py-3 px-4 text-right">NPS</th>
                <th className="py-3 px-4">Sắc thái AI</th>
                <th className="py-3 px-4">Tóm tắt &amp; Chủ đề</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    Không có phản hồi nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const ai = item.aiAnalysis;
                  const isBusy = analyzingId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {item.id}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                          {formatDateVi(item.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800">
                          {CHANNEL_META[item.channel].shortLabel}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {item.customerSegment}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {item.csat}/5
                      </td>
                      <td className="py-3.5 px-4 align-top text-right font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {item.nps}/10
                      </td>
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {ai ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            {ai.sentiment === 'positive' && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            {ai.sentiment === 'neutral' && (
                              <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                            )}
                            {ai.sentiment === 'negative' && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                            )}
                            <span>{SENTIMENT_LABELS[ai.sentiment]}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Chưa phân tích
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-md">
                        {ai ? (
                          <div>
                            <p className="text-xs leading-relaxed text-slate-700 line-clamp-2">
                              {ai.summary}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-teal-800 truncate">
                              {ai.themes.join(' · ')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed text-slate-600 line-clamp-2">
                            {item.improvementFeedback || item.positiveFeedback}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            title="Xem chi tiết"
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAnalyzeSingle(item.id)}
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                          >
                            {isBusy ? 'Đang chạy...' : ai ? 'Phân tích lại' : 'Phân tích AI'}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Xóa ${item.id}`}
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile / Tablet Card List */}
      <div className="lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Không có phản hồi nào khớp bộ lọc hiện tại.
          </div>
        ) : (
          filtered.map((item) => {
            const ai = item.aiAnalysis;
            const isBusy = analyzingId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                      <span className="font-mono font-semibold text-slate-900">
                        {item.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDateVi(item.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{CHANNEL_META[item.channel].shortLabel}</span>
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                    CSAT {item.csat}/5 · NPS {item.nps}
                  </div>
                </div>

                {ai ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      {ai.sentiment === 'positive' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      {ai.sentiment === 'neutral' && (
                        <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                      )}
                      {ai.sentiment === 'negative' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span>{SENTIMENT_LABELS[ai.sentiment]}</span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-teal-800 truncate">
                        {ai.themes.join(', ')}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {ai.summary}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-700">
                    {item.improvementFeedback || item.positiveFeedback}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 min-h-[40px]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Chi tiết</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAnalyzeSingle(item.id)}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:bg-teal-600/60 min-h-[40px]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isBusy ? 'Đang chạy...' : 'Phân tích AI'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Response Detail Modal */}
      {currentModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết phản hồi ${currentModalItem.id}`}
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-teal-700 tabular-nums">
                  {currentModalItem.id} · {formatDateVi(currentModalItem.createdAt)}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {CHANNEL_META[currentModalItem.channel].label} ·{' '}
                  {currentModalItem.customerSegment}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                  Thời gian hoàn thành:{' '}
                  {formatDurationVietnamese(currentModalItem.completionSeconds)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Đóng chi tiết"
                className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 min-h-[40px] min-w-[40px]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Numeric Scores */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 text-center rounded-xl border border-slate-200 bg-slate-50 p-3 tabular-nums">
              <div>
                <p className="text-[11px] text-slate-500">CSAT</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.csat}/5
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">NPS</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.nps}/10
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Tốc độ</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.aspectScores.speed}/5
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Chất lượng</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.aspectScores.quality}/5
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Trải nghiệm</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.aspectScores.experience}/5
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Nhân viên</p>
                <p className="font-mono text-sm font-bold text-slate-900">
                  {currentModalItem.aspectScores.staff}/5
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Phản hồi điểm hài lòng
                </p>
                <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">
                  {currentModalItem.positiveFeedback || '(Không có nội dung)'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Phản hồi góp ý mở đầy đủ
                </p>
                <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">
                  {currentModalItem.improvementFeedback || '(Không có nội dung)'}
                </p>
              </div>
            </div>

            {/* AI Section */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-900">
                  Kết quả phân tích AI
                </p>
                <button
                  type="button"
                  disabled={analyzingId === currentModalItem.id}
                  onClick={() => handleAnalyzeSingle(currentModalItem.id)}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-teal-600/60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {analyzingId === currentModalItem.id
                      ? 'Đang phân tích...'
                      : currentModalItem.aiAnalysis
                      ? 'Phân tích lại'
                      : 'Phân tích ngay'}
                  </span>
                </button>
              </div>

              {currentModalItem.aiAnalysis ? (
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    <span>
                      Sắc thái:{' '}
                      {SENTIMENT_LABELS[currentModalItem.aiAnalysis.sentiment]} (
                      {currentModalItem.aiAnalysis.sentimentScore}/100)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Bộ phận: {currentModalItem.aiAnalysis.suggestedTeam}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Mức độ:{' '}
                      {PRIORITY_LABELS[currentModalItem.aiAnalysis.actionPriority]}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">
                    {currentModalItem.aiAnalysis.summary}
                  </p>
                  <p className="font-medium text-teal-800">
                    Chủ đề: {currentModalItem.aiAnalysis.themes.join(' · ')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Phản hồi này chưa được AI tóm tắt. Nhấn &ldquo;Phân tích ngay&rdquo; để trích xuất chủ đề và sắc thái.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
