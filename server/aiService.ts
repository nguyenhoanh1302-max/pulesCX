import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AggregateAIReport,
  AIResponseAnalysis,
  SurveyResponse,
} from '../src/types/survey';
import { CHANNEL_META } from '../src/utils/surveyHelpers';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Vui lòng kiểm tra mục Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
    return new Error(
      'Gemini API từ chối quyền truy cập (403). Vui lòng kiểm tra GEMINI_API_KEY trong Settings > Secrets.'
    );
  }
  if (msg.includes('400') || msg.includes('API_KEY_INVALID')) {
    return new Error(
      'GEMINI_API_KEY không hợp lệ. Vui lòng cập nhật lại khóa trong Settings > Secrets.'
    );
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return new Error(
      'Hệ thống AI đang vượt giới hạn tần suất (429). Vui lòng thử lại sau ít giây.'
    );
  }
  return new Error(`Không thể hoàn tất phân tích AI: ${msg}`);
}

export async function analyzeSingleResponseWithAI(
  responseItem: SurveyResponse
): Promise<AIResponseAnalysis> {
  const ai = getGeminiClient();
  const channelLabel = CHANNEL_META[responseItem.channel].label;

  const prompt = `Phân tích phản hồi khảo sát khách hàng sau bằng tiếng Việt.
Kênh trải nghiệm: ${channelLabel}
Điểm hài lòng CSAT: ${responseItem.csat}/5
Điểm sẵn sàng giới thiệu NPS: ${responseItem.nps}/10
Điểm hài lòng nhất (câu mở 1): ${responseItem.positiveFeedback || '(Không có nội dung)'}
Đề xuất cải thiện (câu mở 2): ${responseItem.improvementFeedback || '(Không có nội dung)'}

Yêu cầu:
1. Xác định sắc thái tổng thể (positive, neutral, hoặc negative) và điểm sắc thái từ 1 đến 100.
2. Trích xuất 2 đến 4 chủ đề chính ngắn gọn bằng tiếng Việt (ví dụ: "Tốc độ giao hàng", "Thái độ nhân viên").
3. Tóm tắt phản hồi dài thành 1-2 câu súc tích, giữ đúng ý chính của khách hàng.
4. Đánh giá mức độ ưu tiên xử lý (high, medium, low) và bộ phận phù hợp nhất (Marketing & Chiến dịch, Vận hành & Giao nhận, Chăm sóc khách hàng, hoặc Quản trị chất lượng).`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Bạn là chuyên gia phân tích trải nghiệm khách hàng (CX) cho doanh nghiệp Việt Nam. Luôn trả về JSON chuẩn theo schema, ngôn ngữ tiếng Việt tự nhiên, khách quan, không bịa đặt dữ liệu.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              description: 'One of: positive, neutral, negative',
            },
            sentimentScore: {
              type: Type.NUMBER,
              description: 'Score from 1 to 100',
            },
            themes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 concise Vietnamese themes',
            },
            summary: {
              type: Type.STRING,
              description: 'Concise 1-2 sentence Vietnamese summary',
            },
            actionPriority: {
              type: Type.STRING,
              description: 'One of: high, medium, low',
            },
            suggestedTeam: {
              type: Type.STRING,
              description: 'Responsible Vietnamese department name',
            },
          },
          required: [
            'sentiment',
            'sentimentScore',
            'themes',
            'summary',
            'actionPriority',
            'suggestedTeam',
          ],
        },
      },
    });

    const parsed = JSON.parse((result.text ?? '{}').trim()) as {
      sentiment?: string;
      sentimentScore?: number;
      themes?: string[];
      summary?: string;
      actionPriority?: string;
      suggestedTeam?: string;
    };

    const sentiment =
      parsed.sentiment === 'positive' ||
      parsed.sentiment === 'negative' ||
      parsed.sentiment === 'neutral'
        ? parsed.sentiment
        : responseItem.csat >= 4
        ? 'positive'
        : responseItem.csat <= 2
        ? 'negative'
        : 'neutral';

    const actionPriority =
      parsed.actionPriority === 'high' ||
      parsed.actionPriority === 'medium' ||
      parsed.actionPriority === 'low'
        ? parsed.actionPriority
        : sentiment === 'negative'
        ? 'high'
        : 'medium';

    return {
      sentiment,
      sentimentScore: Math.min(100, Math.max(1, Math.round(parsed.sentimentScore ?? 70))),
      themes:
        Array.isArray(parsed.themes) && parsed.themes.length > 0
          ? parsed.themes.slice(0, 4)
          : [channelLabel],
      summary:
        parsed.summary?.trim() ||
        'Khách hàng đã gửi phản hồi trải nghiệm cần được bộ phận chuyên trách xem xét.',
      actionPriority,
      suggestedTeam: parsed.suggestedTeam?.trim() || CHANNEL_META[responseItem.channel].department,
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    throw mapGeminiError(err);
  }
}

export async function synthesizeAggregateInsightsWithAI(
  responses: SurveyResponse[],
  channelFilter: string
): Promise<AggregateAIReport> {
  if (responses.length === 0) {
    throw new Error('Không có phản hồi nào trong bộ lọc hiện tại để AI tổng hợp.');
  }

  const ai = getGeminiClient();

  const feedbackDigest = responses
    .slice(0, 40)
    .map((r) => {
      const ch = CHANNEL_META[r.channel].label;
      return `[${r.id} | ${ch} | CSAT ${r.csat}/5 | NPS ${r.nps}/10] Hài lòng: "${r.positiveFeedback}" | Góp ý: "${r.improvementFeedback}"`;
    })
    .join('\n');

  const prompt = `Tổng hợp và phân tích ${responses.length} phản hồi khảo sát khách hàng (Phạm vi lọc: ${channelFilter}) dưới đây:

${feedbackDigest}

Hãy thực hiện:
1. Viết "executiveSummary" (3–4 câu tiếng Việt mạch lạc) tóm tắt bức tranh chung của các phản hồi dài, nêu rõ điểm mạnh nổi bật và nút thắt cần khắc phục.
2. Nhận diện 4 đến 6 "recurringThemes" (chủ đề thường gặp nhất trong các câu trả lời mở): tên chủ đề, số lần xuất hiện ước tính từ danh sách trên ("count"), sắc thái chủ đạo ("positive" | "neutral" | "negative"), một câu trích dẫn/diễn giải ngắn tiêu biểu ("excerpt"), và bộ phận liên quan ("department").
3. Đề xuất 3 đến 4 "recommendations" (hành động cụ thể) cho các khối Marketing, Thương mại điện tử, Dịch vụ khách hàng và Quản trị chất lượng kèm mức độ ưu tiên ("high" | "medium" | "low").`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'Bạn là Giám đốc Phân tích Trải nghiệm Khách hàng (CX Insights). Tổng hợp dữ liệu khảo sát bằng tiếng Việt chuẩn mực, súc tích, bám sát đúng phản hồi thực tế được cung cấp.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            recurringThemes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  count: { type: Type.NUMBER },
                  sentiment: { type: Type.STRING },
                  excerpt: { type: Type.STRING },
                  department: { type: Type.STRING },
                },
                required: ['theme', 'count', 'sentiment', 'excerpt', 'department'],
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  department: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['department', 'priority', 'action'],
              },
            },
          },
          required: ['executiveSummary', 'recurringThemes', 'recommendations'],
        },
      },
    });

    const parsed = JSON.parse((result.text ?? '{}').trim()) as {
      executiveSummary?: string;
      recurringThemes?: Array<{
        theme?: string;
        count?: number;
        sentiment?: string;
        excerpt?: string;
        department?: string;
      }>;
      recommendations?: Array<{
        department?: string;
        priority?: string;
        action?: string;
      }>;
    };

    const recurringThemes = (parsed.recurringThemes ?? []).slice(0, 6).map((t) => ({
      theme: t.theme?.trim() || 'Chủ đề chung',
      count: Math.max(1, Math.round(t.count ?? 1)),
      sentiment: (t.sentiment === 'positive' ||
      t.sentiment === 'negative' ||
      t.sentiment === 'neutral'
        ? t.sentiment
        : 'neutral') as 'positive' | 'neutral' | 'negative',
      excerpt: t.excerpt?.trim() || '',
      department: t.department?.trim() || 'Quản trị chất lượng',
    }));

    const recommendations = (parsed.recommendations ?? []).slice(0, 4).map((rec) => ({
      department: rec.department?.trim() || 'Dịch vụ khách hàng',
      priority: (rec.priority === 'high' ||
      rec.priority === 'medium' ||
      rec.priority === 'low'
        ? rec.priority
        : 'medium') as 'high' | 'medium' | 'low',
      action: rec.action?.trim() || '',
    }));

    return {
      generatedAt: new Date().toISOString(),
      sampleSize: responses.length,
      channelFilter,
      executiveSummary:
        parsed.executiveSummary?.trim() ||
        'Đã hoàn tất tổng hợp các phản hồi mở của khách hàng.',
      recurringThemes,
      recommendations,
    };
  } catch (err) {
    throw mapGeminiError(err);
  }
}
