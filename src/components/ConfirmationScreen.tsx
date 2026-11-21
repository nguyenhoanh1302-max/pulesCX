import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  MinusCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ScreenId, SurveyResponse } from '../types/survey';
import {
  CHANNEL_META,
  formatDateTimeVi,
  formatDurationVietnamese,
  PRIORITY_LABELS,
  SENTIMENT_LABELS,
} from '../utils/surveyHelpers';

interface ConfirmationScreenProps {
  submission: SurveyResponse | null;
  aiNotice?: string | null;
  isPreviewFromNav: boolean;
  onAnalyzeResponse: (id: string) => Promise<void>;
  onStartAnother: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export function ConfirmationScreen({
  submission,
  aiNotice,
  isPreviewFromNav,
  onAnalyzeResponse,
  onStartAnother,
  onNavigate,
}: ConfirmationScreenProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!submission) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-teal-700" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Chưa có lượt gửi khảo sát mới trong phiên này
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Hãy hoàn thành bảng câu hỏi để xem màn hình xác nhận gửi kèm phân tích AI tức thì.
          </p>
          <button
            type="button"
            onClick={onStartAnother}
            className="mt-6 cursor-pointer rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 min-h-[44px]"
          >
            Đi tới trang câu hỏi
          </button>
        </div>
      </div>
    );
  }

  const handleRunAi = async () => {
    setAnalyzing(true);
    setErrorMsg(null);
    try {
      await onAnalyzeResponse(submission.id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể phân tích AI lúc này.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const ai = submission.aiAnalysis;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 space-y-6">
      {isPreviewFromNav && (
        <div className="rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-xs text-slate-700">
          Đang hiển thị mẫu xác nhận của phản hồi gần nhất (<span className="font-mono font-semibold">{submission.id}</span>). Gửi khảo sát mới ở mục Câu hỏi để kiểm tra trực tiếp.
        </div>
      )}

      {/* Confirmation Hero Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Cảm ơn bạn đã hoàn thành khảo sát
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                <span className="font-mono font-semibold text-slate-800">
                  Mã: {submission.id}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatDateTimeVi(submission.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-teal-800 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Hoàn thành trong {formatDurationVietnamese(submission.completionSeconds)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submitted Metrics Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Lĩnh vực</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {CHANNEL_META[submission.channel].label}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Hài lòng (CSAT)</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {submission.csat} / 5
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Giới thiệu (NPS)</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {submission.nps} / 10
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Nhóm khách hàng</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {submission.customerSegment}
            </p>
          </div>
        </div>

        {/* Verbatim Open Feedback */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Điểm bạn hài lòng nhất
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {submission.positiveFeedback || 'Không có nội dung nhập thêm.'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-semibold text-slate-700">
              Đề xuất cải thiện
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {submission.improvementFeedback || 'Không có nội dung nhập thêm.'}
            </p>
          </div>
        </div>
      </section>

      {/* AI Instant Analysis Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Phân tích ngôn ngữ tự nhiên bằng AI
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Hệ thống tự động trích xuất chủ đề, đánh giá sắc thái và tóm tắt phản hồi cho quản trị viên.
            </p>
          </div>
          {!ai && (
            <button
              type="button"
              onClick={handleRunAi}
              disabled={analyzing}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400 min-h-[40px]"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Chạy phân tích AI</span>
                </>
              )}
            </button>
          )}
        </div>

        {(aiNotice || errorMsg) && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            {errorMsg || aiNotice}
          </div>
        )}

        {ai ? (
          <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                {ai.sentiment === 'positive' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
                {ai.sentiment === 'neutral' && (
                  <MinusCircle className="h-4 w-4 text-amber-600" />
                )}
                {ai.sentiment === 'negative' && (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                Sắc thái: {SENTIMENT_LABELS[ai.sentiment]} ({ai.sentimentScore}/100)
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-700">
                Bộ phận tiếp nhận: <strong>{ai.suggestedTeam}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-700">
                Mức độ: {PRIORITY_LABELS[ai.actionPriority]}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">
                Tóm tắt phản hồi của AI
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">
                {ai.summary}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500">
                Chủ đề nhận diện được
              </p>
              <p className="mt-1 text-sm font-medium text-teal-800">
                {ai.themes.join('  ·  ')}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Phản hồi đã được lưu an toàn vào hệ thống. Bạn có thể nhấn &ldquo;Chạy phân tích AI&rdquo; hoặc quản trị viên sẽ xử lý trong trang quản trị.
          </p>
        )}
      </section>

      {/* Post-Submit Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onStartAnother}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 min-h-[44px]"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Thực hiện khảo sát khác</span>
        </button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
          >
            Mở trang quản trị
          </button>
          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800 min-h-[44px]"
          >
            <span>Xem trang thống kê</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
