import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AdminScreen } from './components/AdminScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { ExportScreen } from './components/ExportScreen';
import { IntroScreen } from './components/IntroScreen';
import { QuestionsScreen } from './components/QuestionsScreen';
import { TopNav } from './components/TopNav';
import type {
  AggregateAIReport,
  DomainChannel,
  ScreenId,
  SurveyCampaignConfig,
  SurveyDraftInput,
  SurveyResponse,
} from './types/survey';
import { computeMetrics } from './utils/surveyHelpers';

const DEFAULT_CONFIG: SurveyCampaignConfig = {
  id: 'cx-q4-2026',
  title: 'Khảo sát Trải nghiệm Khách hàng Toàn kênh Q4/2026',
  estimatedMinutes: 2,
  isActive: true,
  welcomeNote:
    'Ý kiến của bạn giúp đội ngũ Marketing, Thương mại điện tử, Dịch vụ khách hàng và Quản trị chất lượng cải thiện từng điểm chạm thực tế.',
  updatedAt: new Date().toISOString(),
};

const VALID_SCREENS: ScreenId[] = [
  'intro',
  'questions',
  'confirmation',
  'admin',
  'analytics',
  'export',
];

const VALID_CHANNELS: DomainChannel[] = [
  'ecommerce',
  'cskh',
  'marketing',
  'quality',
];

function getInitialRouteFromUrl(): {
  screen: ScreenId;
  channel: DomainChannel;
} {
  if (typeof window === 'undefined') {
    return { screen: 'intro', channel: 'ecommerce' };
  }
  const params = new URLSearchParams(window.location.search);
  const s = params.get('screen') as ScreenId | null;
  const c = params.get('channel') as DomainChannel | null;
  return {
    screen: s && VALID_SCREENS.includes(s) ? s : 'intro',
    channel: c && VALID_CHANNELS.includes(c) ? c : 'ecommerce',
  };
}

export default function App() {
  const initialRoute = useMemo(() => getInitialRouteFromUrl(), []);
  const [activeScreen, setActiveScreen] = useState<ScreenId>(initialRoute.screen);
  const [preferredChannel, setPreferredChannel] = useState<DomainChannel>(
    initialRoute.channel
  );

  const [config, setConfig] = useState<SurveyCampaignConfig>(DEFAULT_CONFIG);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [aggregateReport, setAggregateReport] =
    useState<AggregateAIReport | null>(null);

  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);
  const [lastAiNotice, setLastAiNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSurveyData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/surveys');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tải dữ liệu khảo sát.');
      }
      setConfig(data.config ?? DEFAULT_CONFIG);
      setResponses(Array.isArray(data.responses) ? data.responses : []);
      setAggregateReport(data.lastAggregateReport ?? null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveyData();
  }, [fetchSurveyData]);

  const handleNavigate = (screen: ScreenId, channelOverride?: DomainChannel) => {
    setActiveScreen(screen);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('screen', screen);
      if (channelOverride) {
        url.searchParams.set('channel', channelOverride);
      } else if (screen !== 'questions') {
        url.searchParams.delete('channel');
      }
      window.history.replaceState({}, '', url.toString());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartSurvey = (initialChannel?: DomainChannel) => {
    if (initialChannel) setPreferredChannel(initialChannel);
    handleNavigate('questions', initialChannel);
  };

  const handleSubmitSurvey = async (draft: SurveyDraftInput) => {
    const res = await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể gửi phản hồi.');
    }
    const created: SurveyResponse = data.response;
    setResponses((prev) => [created, ...prev]);
    setLastSubmittedId(created.id);
    setLastAiNotice(data.aiError ?? null);
    handleNavigate('confirmation');
  };

  const handleAnalyzeOne = async (id: string) => {
    const res = await fetch(`/api/surveys/${encodeURIComponent(id)}/analyze`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi chạy phân tích AI.');
    }
    const updated: SurveyResponse = data.response;
    setResponses((prev) => prev.map((r) => (r.id === id ? updated : r)));
    if (id === lastSubmittedId) {
      setLastAiNotice(null);
    }
  };

  const handleAnalyzePending = async (): Promise<number> => {
    const res = await fetch('/api/surveys/analyze-pending', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi phân tích hàng loạt.');
    }
    if (Array.isArray(data.responses)) {
      setResponses(data.responses);
    }
    return Number(data.updatedCount ?? 0);
  };

  const handleDeleteOne = async (id: string) => {
    const res = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể xóa phản hồi.');
    }
    setResponses((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateConfig = async (partial: Partial<SurveyCampaignConfig>) => {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể cập nhật cấu hình.');
    }
    setConfig(data.config);
  };

  const handleSynthesizeAI = async (
    days: 'all' | '7' | '30' | '90',
    channel: 'all' | DomainChannel
  ) => {
    const res = await fetch('/api/analytics/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, channel }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Không thể tổng hợp chủ đề AI.');
    }
    setAggregateReport(data.report);
  };

  const overviewMetrics = useMemo(() => computeMetrics(responses), [responses]);

  const confirmationTarget = useMemo(() => {
    if (lastSubmittedId) {
      const found = responses.find((r) => r.id === lastSubmittedId);
      if (found) return found;
    }
    return responses[0] ?? null;
  }, [lastSubmittedId, responses]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav activeScreen={activeScreen} onNavigate={handleNavigate} />

      <main className="flex-1">
        {loading ? (
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Đang tải dữ liệu khảo sát...
            </p>
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-xl px-4 py-16">
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
              <h1 className="text-base font-bold text-slate-900">
                Không thể kết nối dữ liệu khảo sát
              </h1>
              <p className="text-sm text-slate-600">{loadError}</p>
              <button
                type="button"
                onClick={fetchSurveyData}
                className="cursor-pointer rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[40px]"
              >
                Thử tải lại
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeScreen === 'intro' && (
              <IntroScreen
                config={config}
                totalResponses={overviewMetrics.total}
                avgCsat={overviewMetrics.avgCsat}
                onStartSurvey={handleStartSurvey}
                onNavigate={handleNavigate}
              />
            )}

            {activeScreen === 'questions' && (
              <QuestionsScreen
                config={config}
                initialChannel={preferredChannel}
                onSubmitSurvey={handleSubmitSurvey}
                onCancel={() => handleNavigate('intro')}
              />
            )}

            {activeScreen === 'confirmation' && (
              <ConfirmationScreen
                submission={confirmationTarget}
                aiNotice={lastAiNotice}
                isPreviewFromNav={!lastSubmittedId}
                onAnalyzeResponse={handleAnalyzeOne}
                onStartAnother={() => handleNavigate('questions')}
                onNavigate={handleNavigate}
              />
            )}

            {activeScreen === 'admin' && (
              <AdminScreen
                config={config}
                responses={responses}
                onAnalyzeOne={handleAnalyzeOne}
                onAnalyzePending={handleAnalyzePending}
                onDeleteOne={handleDeleteOne}
                onUpdateConfig={handleUpdateConfig}
              />
            )}

            {activeScreen === 'analytics' && (
              <AnalyticsScreen
                responses={responses}
                aggregateReport={aggregateReport}
                onSynthesizeAI={handleSynthesizeAI}
              />
            )}

            {activeScreen === 'export' && (
              <ExportScreen
                responses={responses}
                aggregateReport={aggregateReport}
              />
            )}
          </>
        )}
      </main>

      <footer className="no-print border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            PulseCX · Hệ thống Khảo sát &amp; Phân tích Mức độ Hài lòng Khách hàng
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('intro')}
              className="cursor-pointer hover:text-slate-900"
            >
              Giới thiệu
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('questions')}
              className="cursor-pointer hover:text-slate-900"
            >
              Khảo sát
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('analytics')}
              className="cursor-pointer hover:text-slate-900"
            >
              Thống kê
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('export')}
              className="cursor-pointer hover:text-slate-900"
            >
              Xuất báo cáo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
