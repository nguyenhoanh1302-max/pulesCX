import { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  Sparkles,
} from 'lucide-react';
import type {
  AggregateAIReport,
  DomainChannel,
  SurveyResponse,
} from '../types/survey';
import {
  CHANNEL_META,
  computeMetrics,
  filterResponses,
  formatDateTimeVi,
  formatDurationVietnamese,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
} from '../utils/surveyHelpers';

interface AnalyticsScreenProps {
  responses: SurveyResponse[];
  aggregateReport: AggregateAIReport | null;
  onSynthesizeAI: (
    days: 'all' | '7' | '30' | '90',
    channel: 'all' | DomainChannel
  ) => Promise<void>;
}

interface WeeklyBucket {
  key: string;
  label: string;
  count: number;
  avgCsat: number;
  npsScore: number;
}

function buildWeeklyBuckets(items: SurveyResponse[]): WeeklyBucket[] {
  if (items.length === 0) return [];
  const map = new Map<string, SurveyResponse[]>();

  for (const r of items) {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    // Monday of week
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);
    const key = monday.toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucketItems]) => {
      const m = computeMetrics(bucketItems);
      const [, mm, dd] = key.split('-');
      return {
        key,
        label: `${dd}/${mm}`,
        count: m.total,
        avgCsat: m.avgCsat,
        npsScore: m.npsScore,
      };
    });
}

export function AnalyticsScreen({
  responses,
  aggregateReport,
  onSynthesizeAI,
}: AnalyticsScreenProps) {
  const [days, setDays] = useState<'all' | '7' | '30' | '90'>('all');
  const [channel, setChannel] = useState<'all' | DomainChannel>('all');
  const [hoveredBucket, setHoveredBucket] = useState<WeeklyBucket | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterResponses(responses, { days, channel }),
    [responses, days, channel]
  );

  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);
  const weekly = useMemo(() => buildWeeklyBuckets(filtered), [filtered]);

  const channelBreakdown = useMemo(() => {
    const timeFiltered = filterResponses(responses, { days, channel: 'all' });
    return (Object.keys(CHANNEL_META) as DomainChannel[]).map((ch) => {
      const subset = timeFiltered.filter((r) => r.channel === ch);
      const m = computeMetrics(subset);
      return {
        channel: ch,
        label: CHANNEL_META[ch].label,
        total: m.total,
        avgCsat: m.avgCsat,
        npsScore: m.npsScore,
      };
    });
  }, [responses, days]);

  const handleSynthesize = async () => {
    setSynthesizing(true);
    setAiError(null);
    try {
      await onSynthesizeAI(days, channel);
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Không thể tổng hợp chủ đề AI lúc này.'
      );
    } finally {
      setSynthesizing(false);
    }
  };

  // SVG Chart Geometry
  const chartW = 640;
  const chartH = 220;
  const padL = 36;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const csatPoints = weekly.map((b, i) => {
    const x =
      weekly.length <= 1
        ? padL + plotW / 2
        : padL + (i / (weekly.length - 1)) * plotW;
    const y = padT + plotH - ((b.avgCsat - 1) / 4) * plotH;
    return { x, y, bucket: b };
  });

  const polylinePath = csatPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    csatPoints.length > 0
      ? `M ${csatPoints[0].x},${padT + plotH} L ${csatPoints
          .map((p) => `${p.x},${p.y}`)
          .join(' L ')} L ${csatPoints[csatPoints.length - 1].x},${padT + plotH} Z`
      : '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Thống kê &amp; Phân tích Xu hướng theo Thời gian
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi biến động hài lòng (CSAT), chỉ số giới thiệu (NPS) và các chủ đề nổi bật do AI tổng hợp từ phản hồi mở.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(
              [
                { id: '7', label: '7 ngày' },
                { id: '30', label: '30 ngày' },
                { id: '90', label: '90 ngày' },
                { id: 'all', label: 'Toàn bộ' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDays(opt.id)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  days === opt.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Lọc lĩnh vực"
            value={channel}
            onChange={(e) => setChannel(e.target.value as 'all' | DomainChannel)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-700 focus:outline-none min-h-[38px]"
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

      {/* 4-Column Executive KPI Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Điểm hài lòng TB (CSAT)</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {metrics.avgCsat.toFixed(2)}
            <span className="text-base font-normal text-slate-400"> / 5.0</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {metrics.csatSatisfiedRate}% đánh giá từ 4 sao trở lên
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Chỉ số NPS</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {metrics.npsScore > 0 ? `+${metrics.npsScore}` : metrics.npsScore}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            {metrics.promoters} ủng hộ · {metrics.passives} trung lập · {metrics.detractors} không hài lòng
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Tổng lượt phản hồi</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {metrics.total}
          </p>
          <p className="mt-1.5 text-xs text-slate-600 tabular-nums">
            Thời gian hoàn thành TB: {formatDurationVietnamese(metrics.avgCompletionSeconds)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Phản hồi cần ưu tiên</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {metrics.negativeCount}
            <span className="text-base font-normal text-slate-400">
              {' '}
              ({metrics.negativeRate}%)
            </span>
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Sắc thái tiêu cực hoặc CSAT ≤ 2 sao
          </p>
        </div>
      </section>

      {/* Time-Series Trend + Domain Breakdown */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly CSAT & Volume Trend Chart */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Xu hướng mức độ hài lòng (CSAT) theo tuần
              </h2>
              <p className="text-xs text-slate-500">
                Di chuột hoặc chạm vào từng điểm tuần để xem chi tiết số lượng và NPS
              </p>
            </div>
            {hoveredBucket && (
              <div className="text-xs font-medium text-teal-800 tabular-nums">
                Tuần {hoveredBucket.label}: CSAT {hoveredBucket.avgCsat.toFixed(2)} · NPS{' '}
                {hoveredBucket.npsScore} · {hoveredBucket.count} lượt
              </div>
            )}
          </div>

          {weekly.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              Chưa có đủ dữ liệu trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full min-w-[460px] h-56"
                role="img"
                aria-label="Biểu đồ xu hướng CSAT theo tuần"
              >
                <defs>
                  <linearGradient id="csatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines 1..5 */}
                {[1, 2, 3, 4, 5].map((tick) => {
                  const y = padT + plotH - ((tick - 1) / 4) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        x2={chartW - padR}
                        y1={y}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 font-mono text-[10px]"
                      >
                        {tick}.0
                      </text>
                    </g>
                  );
                })}

                {areaPath && <path d={areaPath} fill="url(#csatAreaGrad)" />}

                {csatPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePath}
                  />
                )}

                {csatPoints.map(({ x, y, bucket }) => {
                  const isHovered = hoveredBucket?.key === bucket.key;
                  return (
                    <g
                      key={bucket.key}
                      onMouseEnter={() => setHoveredBucket(bucket)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      onClick={() => setHoveredBucket(bucket)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 4.5}
                        fill={isHovered ? '#0f172a' : '#0f766e'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={chartH - 10}
                        textAnchor="middle"
                        className="fill-slate-500 font-mono text-[10px]"
                      >
                        {bucket.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Aspect & Department Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Điểm trung bình theo khía cạnh
            </h2>
            <div className="mt-3 space-y-3">
              {(
                [
                  { label: 'Chất lượng sản phẩm / dịch vụ', value: metrics.aspectAverages.quality },
                  { label: 'Thái độ & chuyên môn nhân viên', value: metrics.aspectAverages.staff },
                  { label: 'Trải nghiệm kênh mua sắm', value: metrics.aspectAverages.experience },
                  { label: 'Tốc độ phản hồi & giao nhận', value: metrics.aspectAverages.speed },
                ] as const
              ).map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{row.label}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {row.value.toFixed(2)} / 5.0
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-700"
                      style={{ width: `${(row.value / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              So sánh 4 lĩnh vực trọng tâm
            </h3>
            <div className="mt-3 divide-y divide-slate-100 text-xs">
              {channelBreakdown.map((item) => (
                <div
                  key={item.channel}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{item.label}</span>
                    <span className="ml-2 text-slate-500 tabular-nums">
                      ({item.total} lượt)
                    </span>
                  </div>
                  <div className="font-mono font-semibold text-slate-900 tabular-nums">
                    CSAT {item.avgCsat.toFixed(2)} · NPS{' '}
                    {item.npsScore > 0 ? `+${item.npsScore}` : item.npsScore}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Topic & Long-Feedback Intelligence Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              AI Nhận diện Chủ đề &amp; Tóm tắt Phản hồi dài
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Tổng hợp ngôn ngữ tự nhiên từ {filtered.length} phản hồi trong bộ lọc hiện tại để phát hiện vấn đề lặp lại và đề xuất hành động.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSynthesize}
            disabled={synthesizing || filtered.length === 0}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300 min-h-[44px] shrink-0"
          >
            {synthesizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI đang tổng hợp...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Tổng hợp chủ đề bằng AI</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {aggregateReport ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  Tóm tắt điều hành phản hồi mở
                </span>
                <span className="tabular-nums">
                  Cập nhật: {formatDateTimeVi(aggregateReport.generatedAt)} · Mẫu:{' '}
                  {aggregateReport.sampleSize} phản hồi
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-800">
                {aggregateReport.executiveSummary}
              </p>
            </div>

            {/* Recurring Themes Grid */}
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Chủ đề thường gặp được AI nhận diện
              </h3>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {aggregateReport.recurringThemes.map((t) => (
                  <div
                    key={t.theme}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{t.theme}</h4>
                      <span className="font-mono text-xs font-semibold text-teal-800 tabular-nums shrink-0">
                        {t.count} lượt
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        {t.sentiment === 'positive' && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                        {t.sentiment === 'neutral' && (
                          <MinusCircle className="h-3.5 w-3.5 text-amber-600" />
                        )}
                        {t.sentiment === 'negative' && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        )}
                        {SENTIMENT_LABELS[t.sentiment]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{t.department}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600">
                      &ldquo;{t.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Recommendations */}
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Khuyến nghị hành động theo bộ phận
              </h3>
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {aggregateReport.recommendations.map((rec, idx) => (
                  <div
                    key={`${rec.department}-${idx}`}
                    className="flex flex-col gap-1.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900">
                        {rec.department}
                      </p>
                      <p className="text-sm text-slate-700">{rec.action}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 shrink-0">
                      {PRIORITY_LABELS[rec.priority]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Chưa có bản tổng hợp chủ đề AI cho đợt dữ liệu này
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Nhấn &ldquo;Tổng hợp chủ đề bằng AI&rdquo; để Gemini phân tích đồng loạt các câu trả lời mở, đếm chủ đề thường gặp và tóm tắt phản hồi dài.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
