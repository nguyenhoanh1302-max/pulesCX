import type {
  ActionPriority,
  DomainChannel,
  SentimentType,
  SurveyResponse,
} from '../types/survey';

export const CHANNEL_META: Record<
  DomainChannel,
  {
    label: string;
    shortLabel: string;
    department: string;
    description: string;
  }
> = {
  ecommerce: {
    label: 'Thương mại điện tử',
    shortLabel: 'TMĐT',
    department: 'Vận hành & Giao nhận',
    description: 'Trải nghiệm đặt hàng, thanh toán, đóng gói và giao nhận trực tuyến.',
  },
  cskh: {
    label: 'Dịch vụ khách hàng',
    shortLabel: 'CSKH',
    department: 'Chăm sóc khách hàng',
    description: 'Tốc độ phản hồi tổng đài, thái độ tư vấn và xử lý khiếu nại.',
  },
  marketing: {
    label: 'Marketing & Truyền thông',
    shortLabel: 'Marketing',
    department: 'Marketing & Chiến dịch',
    description: 'Độ rõ ràng của thông điệp ưu đãi, nội dung quảng bá và tính nhất quán.',
  },
  quality: {
    label: 'Quản trị chất lượng',
    shortLabel: 'Chất lượng',
    department: 'Quản trị chất lượng',
    description: 'Độ bền sản phẩm, tiêu chuẩn hoàn thiện và cam kết dịch vụ sau bán.',
  },
};

export const SENTIMENT_LABELS: Record<SentimentType, string> = {
  positive: 'Tích cực',
  neutral: 'Trung lập',
  negative: 'Tiêu cực',
};

export const PRIORITY_LABELS: Record<ActionPriority, string> = {
  high: 'Ưu tiên cao',
  medium: 'Trung bình',
  low: 'Theo dõi',
};

export function formatDurationVietnamese(totalSeconds: number): string {
  const safe = Math.max(1, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs} giây`;
  if (secs === 0) return `${mins} phút`;
  return `${mins} phút ${secs} giây`;
}

export function formatDateVi(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTimeVi(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function computeMetrics(items: SurveyResponse[]) {
  const count = items.length;
  if (count === 0) {
    return {
      total: 0,
      avgCsat: 0,
      csatSatisfiedRate: 0,
      npsScore: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      avgCompletionSeconds: 0,
      negativeCount: 0,
      negativeRate: 0,
      aspectAverages: {
        speed: 0,
        quality: 0,
        experience: 0,
        staff: 0,
      },
    };
  }

  let csatSum = 0;
  let csatSatisfied = 0;
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let durationSum = 0;
  let negativeCount = 0;
  let speedSum = 0;
  let qualitySum = 0;
  let experienceSum = 0;
  let staffSum = 0;

  for (const r of items) {
    csatSum += r.csat;
    if (r.csat >= 4) csatSatisfied += 1;
    if (r.nps >= 9) promoters += 1;
    else if (r.nps >= 7) passives += 1;
    else detractors += 1;
    durationSum += r.completionSeconds;
    if (r.aiAnalysis?.sentiment === 'negative' || (!r.aiAnalysis && r.csat <= 2)) {
      negativeCount += 1;
    }
    speedSum += r.aspectScores.speed;
    qualitySum += r.aspectScores.quality;
    experienceSum += r.aspectScores.experience;
    staffSum += r.aspectScores.staff;
  }

  const npsScore = Math.round(((promoters - detractors) / count) * 100);

  return {
    total: count,
    avgCsat: Number((csatSum / count).toFixed(2)),
    csatSatisfiedRate: Math.round((csatSatisfied / count) * 100),
    npsScore,
    promoters,
    passives,
    detractors,
    avgCompletionSeconds: Math.round(durationSum / count),
    negativeCount,
    negativeRate: Math.round((negativeCount / count) * 100),
    aspectAverages: {
      speed: Number((speedSum / count).toFixed(2)),
      quality: Number((qualitySum / count).toFixed(2)),
      experience: Number((experienceSum / count).toFixed(2)),
      staff: Number((staffSum / count).toFixed(2)),
    },
  };
}

export function filterResponses(
  items: SurveyResponse[],
  options: {
    days: 'all' | '7' | '30' | '90';
    channel: 'all' | DomainChannel;
    sentiment?: 'all' | SentimentType;
    search?: string;
  }
): SurveyResponse[] {
  const now = Date.now();
  const query = (options.search ?? '').trim().toLowerCase();

  return items.filter((item) => {
    if (options.channel !== 'all' && item.channel !== options.channel) {
      return false;
    }
    if (options.sentiment && options.sentiment !== 'all') {
      const itemSentiment = item.aiAnalysis?.sentiment;
      if (itemSentiment !== options.sentiment) return false;
    }
    if (options.days !== 'all') {
      const daysNum = Number(options.days);
      const created = new Date(item.createdAt).getTime();
      if (now - created > daysNum * 24 * 60 * 60 * 1000) {
        return false;
      }
    }
    if (query) {
      const haystack = [
        item.id,
        item.positiveFeedback,
        item.improvementFeedback,
        item.customerSegment,
        item.aiAnalysis?.summary ?? '',
        ...(item.aiAnalysis?.themes ?? []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
