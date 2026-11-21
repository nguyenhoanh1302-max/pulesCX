import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import type {
  DomainChannel,
  ScreenId,
  SurveyCampaignConfig,
} from '../types/survey';
import { CHANNEL_META } from '../utils/surveyHelpers';

interface IntroScreenProps {
  config: SurveyCampaignConfig;
  totalResponses: number;
  avgCsat: number;
  onStartSurvey: (initialChannel?: DomainChannel) => void;
  onNavigate: (screen: ScreenId) => void;
}

const SCREEN_MAP_STEPS: Array<{
  step: string;
  id: ScreenId;
  title: string;
  summary: string;
  role: string;
  icon: typeof ClipboardList;
}> = [
  {
    step: '01',
    id: 'intro',
    title: 'Trang giới thiệu',
    summary: 'Thông báo rõ mục tiêu, tính bảo mật và thời gian hoàn thành dự kiến.',
    role: 'Khách hàng',
    icon: MessageSquareText,
  },
  {
    step: '02',
    id: 'questions',
    title: 'Trang câu hỏi',
    summary: 'Giao diện chạm thân thiện điện thoại, thanh tiến trình và ước lượng thời gian.',
    role: 'Khách hàng',
    icon: ClipboardList,
  },
  {
    step: '03',
    id: 'confirmation',
    title: 'Trang xác nhận gửi',
    summary: 'Ghi nhận mã phản hồi, thời gian thực hiện và kết quả phân loại AI tức thì.',
    role: 'Khách hàng',
    icon: CheckCircle2,
  },
  {
    step: '04',
    id: 'admin',
    title: 'Trang quản trị',
    summary: 'Theo dõi hộp thư phản hồi, cấu hình khảo sát và kích hoạt phân tích AI.',
    role: 'Quản trị viên',
    icon: LayoutDashboard,
  },
  {
    step: '05',
    id: 'analytics',
    title: 'Trang thống kê',
    summary: 'Biểu đồ CSAT/NPS theo thời gian, chủ đề thường gặp và tóm tắt phản hồi dài.',
    role: 'Quản trị viên',
    icon: BarChart3,
  },
  {
    step: '06',
    id: 'export',
    title: 'Trang xuất báo cáo',
    summary: 'Tạo bản xem trước báo cáo quản trị và tải xuống CSV, JSON hoặc in PDF.',
    role: 'Quản trị viên',
    icon: FileSpreadsheet,
  },
];

export function IntroScreen({
  config,
  totalResponses,
  avgCsat,
  onStartSurvey,
  onNavigate,
}: IntroScreenProps) {
  const [selectedChannel, setSelectedChannel] = useState<DomainChannel>('ecommerce');
  const [imageError, setImageError] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-12">
      {/* Split Hero Section */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span>{config.isActive ? 'Đang mở tiếp nhận' : 'Đang tạm dừng'}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-teal-800">
                <Clock className="h-3.5 w-3.5" />
                Thời gian hoàn thành: ~{config.estimatedMinutes} phút (6 câu hỏi)
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                Ẩn danh &amp; Bảo mật
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.15] text-balance">
                {config.title}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-600">
                {config.welcomeNote}
              </p>
            </div>

            {/* Quick touchpoint selection */}
            <div className="space-y-2.5 pt-2">
              <p className="text-sm font-semibold text-slate-800">
                Chọn điểm chạm bạn vừa trải nghiệm để bắt đầu nhanh:
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(Object.keys(CHANNEL_META) as DomainChannel[]).map((ch) => {
                  const meta = CHANNEL_META[ch];
                  const active = selectedChannel === ch;
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSelectedChannel(ch)}
                      className={`cursor-pointer rounded-xl border p-3.5 text-left transition-colors min-h-[60px] ${
                        active
                          ? 'border-teal-700 bg-teal-50/70 text-slate-900'
                          : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <span className="text-xs font-medium text-slate-500">
                          {meta.shortLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                        {meta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!config.isActive}
                onClick={() => onStartSurvey(selectedChannel)}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 min-h-[48px] w-full sm:w-auto"
              >
                <span>Bắt đầu khảo sát ngay</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('analytics')}
                className="cursor-pointer inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 min-h-[48px] w-full sm:w-auto"
              >
                Xem kết quả thống kê
              </button>
            </div>
            <p className="text-xs text-slate-500 tabular-nums">
              {totalResponses} phản hồi đã ghi nhận · CSAT {avgCsat.toFixed(2)}/5.0
            </p>
          </div>
        </div>

        {/* Right visual slot */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 min-h-[260px] lg:min-h-full">
          {!imageError ? (
            <img
              src="/src/assets/images/survey_intro_workspace_1795272910770.jpg"
              alt="Khách hàng thực hiện khảo sát mức độ hài lòng trên máy tính bảng tại quầy dịch vụ"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="h-full w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50 p-8 text-center">
              <MessageSquareText className="h-10 w-10 text-teal-700" />
              <p className="mt-3 text-sm font-semibold text-slate-800">
                Khảo sát Trải nghiệm Khách hàng
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-6 text-white">
            <p className="text-xs font-medium text-teal-200">
              Tối ưu di động · Phân tích AI tự động
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              Mọi câu trả lời mở được AI phân tích sắc thái, nhóm chủ đề và chuyển đúng tới bộ phận phụ trách.
            </p>
          </div>
        </div>
      </section>

      {/* Screen Map (Sơ đồ 6 màn hình) */}
      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Sơ đồ hệ thống 6 màn hình
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Quy trình khép kín từ thu thập phản hồi thuận tiện trên điện thoại đến phân tích xu hướng theo thời gian và xuất báo cáo.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Chọn một màn hình để trải nghiệm trực tiếp
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCREEN_MAP_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  item.id === 'questions' ? onStartSurvey(selectedChannel) : onNavigate(item.id)
                }
                className="group cursor-pointer flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-teal-700 hover:bg-slate-50/50"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold text-teal-700">
                        {item.step}
                      </span>
                      <span className="text-xs text-slate-500">· {item.role}</span>
                    </div>
                    <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-teal-700" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {item.summary}
                  </p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                  <span>Mở màn hình</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Domain Significance Strip */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Giá trị ứng dụng đa phòng ban
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            AI bóc tách ngôn ngữ tự nhiên từ phản hồi dài thành chỉ số hành động cụ thể cho từng khối nghiệp vụ.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Marketing</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Đo mức độ rõ ràng của thông điệp ưu đãi, nhận diện kỳ vọng khách hàng và điều chỉnh chiến dịch truyền thông.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Thương mại điện tử</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Phát hiện điểm nghẽn thanh toán, áp mã giảm giá, đóng gói và tốc độ giao nhận trên từng tuyến.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Dịch vụ khách hàng</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Theo dõi thời gian chờ tổng đài, chất lượng tư vấn viên và phân loại tự động các phản hồi cần xử lý khẩn.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quản trị chất lượng</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Tổng hợp lỗi sản phẩm lặp lại theo lô, theo dõi biến động CSAT/NPS theo tuần để cải tiến quy chuẩn.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
