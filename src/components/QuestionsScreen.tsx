import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Send,
  Star,
} from 'lucide-react';
import type {
  DomainChannel,
  SurveyCampaignConfig,
  SurveyDraftInput,
} from '../types/survey';
import { CHANNEL_META, formatDurationVietnamese } from '../utils/surveyHelpers';

interface QuestionsScreenProps {
  config: SurveyCampaignConfig;
  initialChannel?: DomainChannel;
  onSubmitSurvey: (draft: SurveyDraftInput) => Promise<void>;
  onCancel: () => void;
}

const TOTAL_STEPS = 5;

const CSAT_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Không hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất hài lòng',
};

const CUSTOMER_SEGMENTS = [
  'Khách hàng mới',
  'Khách hàng thân thiết',
  'Doanh nghiệp (B2B)',
  'Ẩn danh',
];

const QUICK_POSITIVE_CHIPS = [
  'Giao hàng đúng hẹn',
  'Tư vấn nhiệt tình',
  'Sản phẩm đúng mô tả',
  'Thanh toán nhanh gọn',
];

export function QuestionsScreen({
  config,
  initialChannel = 'ecommerce',
  onSubmitSurvey,
  onCancel,
}: QuestionsScreenProps) {
  const [step, setStep] = useState(1);
  const [startedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [channel, setChannel] = useState<DomainChannel>(initialChannel);
  const [customerSegment, setCustomerSegment] = useState('Khách hàng thân thiết');
  const [csat, setCsat] = useState<number>(5);
  const [nps, setNps] = useState<number>(9);
  const [aspectScores, setAspectScores] = useState({
    speed: 4,
    quality: 5,
    experience: 4,
    staff: 5,
  });
  const [positiveFeedback, setPositiveFeedback] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setChannel(initialChannel);
  }, [initialChannel]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);
  const totalEstimatedSeconds = config.estimatedMinutes * 60;
  const remainingSeconds = Math.max(
    15,
    Math.round(totalEstimatedSeconds * ((TOTAL_STEPS - step + 1) / TOTAL_STEPS))
  );

  const handleAddQuickPositive = (phrase: string) => {
    setPositiveFeedback((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return phrase;
      if (trimmed.toLowerCase().includes(phrase.toLowerCase())) return prev;
      return `${trimmed}, ${phrase.toLowerCase()}`;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const completionSeconds = Math.max(
      10,
      Math.round((Date.now() - startedAt) / 1000)
    );
    try {
      await onSubmitSurvey({
        channel,
        customerSegment,
        csat,
        nps,
        aspectScores,
        positiveFeedback,
        improvementFeedback,
        completionSeconds,
      });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi khảo sát. Vui lòng thử lại.'
      );
      setSubmitting(false);
    }
  };

  if (!config.isActive) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Chiến dịch khảo sát hiện đang tạm đóng
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Quản trị viên đã tạm ngưng tiếp nhận phản hồi mới. Bạn có thể quay lại trang giới thiệu hoặc mở trang quản trị để kích hoạt lại.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="mt-6 cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 min-h-[44px]"
          >
            Quay về giới thiệu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-12">
      {/* Progress Bar & Time Estimate Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 tabular-nums">
            <span>
              Bước {step} / {TOTAL_STEPS}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="text-teal-700">{progressPercent}% hoàn thành</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 tabular-nums">
            <Clock className="h-3.5 w-3.5 text-teal-700" />
            <span>
              Còn khoảng {formatDurationVietnamese(remainingSeconds)}
            </span>
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline text-slate-400">
              Đã dùng {elapsedSeconds}s
            </span>
          </div>
        </div>

        {/* Animated Progress Track */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến trình trả lời khảo sát"
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-teal-700 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[11px] text-slate-500">
          {['Ngữ cảnh', 'CSAT & NPS', 'Khía cạnh', 'Điểm tốt', 'Góp ý mở'].map(
            (label, idx) => {
              const stepNum = idx + 1;
              const isCurrent = stepNum === step;
              const isDone = stepNum < step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(stepNum)}
                  className={`cursor-pointer truncate rounded-md py-1 px-1 transition-colors ${
                    isCurrent
                      ? 'font-semibold text-teal-800 bg-teal-50'
                      : isDone
                      ? 'font-medium text-slate-700 hover:bg-slate-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {stepNum}. {label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 1 / 6 · Ngữ cảnh trải nghiệm
              </p>
              <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Bạn muốn đánh giá trải nghiệm ở lĩnh vực nào?
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Chạm chọn 1 lĩnh vực chính để hệ thống chuyển phản hồi đúng bộ phận xử lý.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(Object.keys(CHANNEL_META) as DomainChannel[]).map((ch) => {
                const meta = CHANNEL_META[ch];
                const selected = channel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`cursor-pointer flex flex-col justify-between rounded-xl border p-4 text-left transition-colors min-h-[84px] ${
                      selected
                        ? 'border-teal-700 bg-teal-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {meta.label}
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 text-teal-700 shrink-0" />
                      )}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-900">
                Nhóm khách hàng (không bắt buộc)
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CUSTOMER_SEGMENTS.map((seg) => {
                  const selected = customerSegment === seg;
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setCustomerSegment(seg)}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px] ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {seg}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            {/* Q2: CSAT */}
            <div>
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 2 / 6 · Mức độ hài lòng tổng thể (CSAT)
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Bạn hài lòng thế nào với trải nghiệm vừa qua?
              </h2>

              <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((score) => {
                  const active = csat === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setCsat(score)}
                      className={`cursor-pointer flex flex-col items-center justify-center gap-1.5 rounded-xl border py-3 px-2 transition-colors min-h-[72px] ${
                        active
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          score <= csat
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                      <span className="font-mono text-sm font-bold tabular-nums">
                        {score}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-sm font-medium text-teal-800">
                Lựa chọn hiện tại: {csat}/5 — {CSAT_LABELS[csat]}
              </p>
            </div>

            {/* Q3: NPS */}
            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 3 / 6 · Chỉ số sẵn sàng giới thiệu (NPS)
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                Khả năng bạn giới thiệu sản phẩm/dịch vụ cho bạn bè hoặc đồng nghiệp?
              </h2>

              <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                  const selected = nps === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNps(val)}
                      className={`cursor-pointer flex items-center justify-center rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors min-h-[46px] ${
                        selected
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>0 · Chắc chắn không</span>
                <span>10 · Chắc chắn giới thiệu</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 4 / 6 · Đánh giá chi tiết từng khía cạnh
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Chấm điểm nhanh 4 yếu tố dịch vụ (1 đến 5)
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {(
                [
                  {
                    key: 'speed',
                    title: 'Tốc độ phản hồi & giao nhận',
                    desc: 'Thời gian xử lý đơn hàng, giải đáp hỗ trợ',
                  },
                  {
                    key: 'quality',
                    title: 'Chất lượng sản phẩm & dịch vụ',
                    desc: 'Độ hoàn thiện, đúng cam kết truyền thông',
                  },
                  {
                    key: 'experience',
                    title: 'Sự thuận tiện trên kênh số',
                    desc: 'Đặt hàng, tra cứu, thanh toán trên điện thoại',
                  },
                  {
                    key: 'staff',
                    title: 'Thái độ & chuyên môn nhân viên',
                    desc: 'Sự nhiệt tình, rõ ràng khi tư vấn & hỗ trợ',
                  },
                ] as const
              ).map((item) => {
                const currentVal = aspectScores[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className="grid grid-cols-5 gap-2 sm:w-64 shrink-0">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const active = currentVal === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setAspectScores((prev) => ({
                                ...prev,
                                [item.key]: num,
                              }))
                            }
                            className={`cursor-pointer rounded-lg border font-mono text-sm font-semibold tabular-nums transition-colors min-h-[44px] ${
                              active
                                ? 'border-teal-700 bg-teal-700 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 5 / 6 · Câu trả lời mở
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Điều gì khiến bạn hài lòng nhất trong lần trải nghiệm này?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có thể nhập ngắn gọn hoặc chạm chọn nhanh các gợi ý phổ biến bên dưới.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_POSITIVE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAddQuickPositive(chip)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-teal-700 hover:bg-teal-50 min-h-[40px]"
                >
                  + {chip}
                </button>
              ))}
            </div>

            <div>
              <label
                htmlFor="positive-feedback"
                className="block text-sm font-medium text-slate-800"
              >
                Chia sẻ điểm bạn hài lòng
              </label>
              <textarea
                id="positive-feedback"
                rows={4}
                maxLength={1500}
                value={positiveFeedback}
                onChange={(e) => setPositiveFeedback(e.target.value)}
                placeholder="Ví dụ: Quy trình đặt hàng trên điện thoại rất nhanh, nhân viên giao hàng gọi trước lịch sự..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
              <p className="mt-1.5 text-right font-mono text-xs text-slate-400 tabular-nums">
                {positiveFeedback.length}/1500
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Câu hỏi 6 / 6 · Phản hồi chi tiết &amp; Đề xuất cải thiện
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                Chúng tôi có thể cải thiện điều gì để phục vụ bạn tốt hơn?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có thể viết tự do dù ngắn hay dài. AI sẽ tự động nhận diện chủ đề, tóm tắt ý chính và chuyển đến bộ phận liên quan.
              </p>
            </div>

            <div>
              <label
                htmlFor="improvement-feedback"
                className="block text-sm font-medium text-slate-800"
              >
                Nội dung góp ý mở
              </label>
              <textarea
                id="improvement-feedback"
                rows={5}
                maxLength={2500}
                value={improvementFeedback}
                onChange={(e) => setImprovementFeedback(e.target.value)}
                placeholder="Ví dụ: Khâu đóng gói tốt nhưng thời gian chờ tổng đài buổi trưa hơi lâu, hoặc điều kiện áp dụng mã giảm giá nên ghi rõ hơn ngay trên banner..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
              <p className="mt-1.5 text-right font-mono text-xs text-slate-400 tabular-nums">
                {improvementFeedback.length}/2500
              </p>
            </div>

            {/* Summary review strip */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Tóm tắt đánh giá của bạn</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                <span>Lĩnh vực: {CHANNEL_META[channel].label}</span>
                <span aria-hidden="true">·</span>
                <span>CSAT: {csat}/5</span>
                <span aria-hidden="true">·</span>
                <span>NPS: {nps}/10</span>
                <span aria-hidden="true">·</span>
                <span>Nhóm: {customerSegment}</span>
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </div>
        )}

        {/* Desktop inline navigation controls */}
        <div className="mt-8 hidden sm:flex items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => (step === 1 ? onCancel() : setStep((s) => s - 1))}
            disabled={submitting}
            className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{step === 1 ? 'Về giới thiệu' : 'Quay lại'}</span>
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 min-h-[44px]"
            >
              <span>Tiếp theo</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-teal-600/60 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang gửi &amp; phân tích AI...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Gửi khảo sát</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile sticky thumb-zone bottom bar (compact <= 64px so total mobile sticky <= 15% viewport) */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? onCancel() : setStep((s) => s - 1))}
            disabled={submitting}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 min-h-[44px] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{step === 1 ? 'Thoát' : 'Trước'}</span>
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white active:scale-[0.99] min-h-[44px]"
            >
              <span>Tiếp theo ({step}/{TOTAL_STEPS})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-semibold text-white active:scale-[0.99] disabled:bg-teal-600/60 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Gửi khảo sát</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
