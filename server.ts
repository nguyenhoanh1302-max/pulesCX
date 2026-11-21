import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import type { DomainChannel, SurveyResponse } from './src/types/survey';
import { filterResponses } from './src/utils/surveyHelpers';
import {
  analyzeSingleResponseWithAI,
  synthesizeAggregateInsightsWithAI,
} from './server/aiService';
import { generateNextSurveyId, readStore, writeStore } from './server/store';

const VALID_CHANNELS: DomainChannel[] = ['ecommerce', 'cskh', 'marketing', 'quality'];

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Get all survey responses, campaign config, and last aggregate report
  app.get('/api/surveys', (_req, res) => {
    try {
      const store = readStore();
      const sorted = [...store.responses].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({
        config: store.config,
        responses: sorted,
        lastAggregateReport: store.lastAggregateReport,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi đọc dữ liệu khảo sát';
      res.status(500).json({ error: message });
    }
  });

  // Submit a new customer survey response
  app.post('/api/surveys', async (req, res) => {
    try {
      const body = req.body ?? {};
      const store = readStore();

      if (!store.config.isActive) {
        res.status(403).json({
          error: 'Chiến dịch khảo sát hiện đang tạm dừng tiếp nhận phản hồi mới.',
        });
        return;
      }

      const channel: DomainChannel = VALID_CHANNELS.includes(body.channel)
        ? body.channel
        : 'ecommerce';

      const scores = body.aspectScores ?? {};
      const newResponse: SurveyResponse = {
        id: generateNextSurveyId(store.responses),
        createdAt: new Date().toISOString(),
        completionSeconds: clampInt(body.completionSeconds, 5, 3600, 95),
        channel,
        csat: clampInt(body.csat, 1, 5, 5),
        nps: clampInt(body.nps, 0, 10, 9),
        aspectScores: {
          speed: clampInt(scores.speed, 1, 5, 4),
          quality: clampInt(scores.quality, 1, 5, 4),
          experience: clampInt(scores.experience, 1, 5, 4),
          staff: clampInt(scores.staff, 1, 5, 4),
        },
        positiveFeedback: sanitizeText(body.positiveFeedback, 1500),
        improvementFeedback: sanitizeText(body.improvementFeedback, 2500),
        customerSegment: sanitizeText(body.customerSegment, 80) || 'Khách hàng',
      };

      let aiError: string | undefined;
      const hasOpenText =
        newResponse.positiveFeedback.length > 0 ||
        newResponse.improvementFeedback.length > 0;

      if (hasOpenText && process.env.GEMINI_API_KEY?.trim()) {
        try {
          newResponse.aiAnalysis = await analyzeSingleResponseWithAI(newResponse);
        } catch (err) {
          aiError =
            err instanceof Error
              ? err.message
              : 'Không thể phân tích AI ngay lúc gửi.';
        }
      }

      store.responses.unshift(newResponse);
      writeStore(store);

      res.status(201).json({
        response: newResponse,
        aiError,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lưu khảo sát';
      res.status(500).json({ error: message });
    }
  });

  // Analyze or re-analyze a single response with Gemini AI
  app.post('/api/surveys/:id/analyze', async (req, res) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const idx = store.responses.findIndex((r) => r.id === id);

      if (idx === -1) {
        res.status(404).json({ error: 'Không tìm thấy mã phản hồi yêu cầu.' });
        return;
      }

      const analysis = await analyzeSingleResponseWithAI(store.responses[idx]);
      store.responses[idx] = {
        ...store.responses[idx],
        aiAnalysis: analysis,
      };
      writeStore(store);

      res.json({ response: store.responses[idx] });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi phân tích AI';
      res.status(502).json({ error: message });
    }
  });

  // Batch analyze pending responses without AI analysis
  app.post('/api/surveys/analyze-pending', async (_req, res) => {
    try {
      const store = readStore();
      const pending = store.responses.filter(
        (r) => !r.aiAnalysis && (r.positiveFeedback || r.improvementFeedback)
      );

      if (pending.length === 0) {
        res.json({ updatedCount: 0, responses: store.responses });
        return;
      }

      let updatedCount = 0;
      for (const item of pending.slice(0, 8)) {
        const analysis = await analyzeSingleResponseWithAI(item);
        const targetIdx = store.responses.findIndex((r) => r.id === item.id);
        if (targetIdx !== -1) {
          store.responses[targetIdx] = {
            ...store.responses[targetIdx],
            aiAnalysis: analysis,
          };
          updatedCount += 1;
        }
      }

      writeStore(store);
      res.json({ updatedCount, responses: store.responses });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi phân tích hàng loạt';
      res.status(502).json({ error: message });
    }
  });

  // Delete a survey response (Admin action)
  app.delete('/api/surveys/:id', (req, res) => {
    try {
      const { id } = req.params;
      const store = readStore();
      const before = store.responses.length;
      store.responses = store.responses.filter((r) => r.id !== id);
      if (store.responses.length === before) {
        res.status(404).json({ error: 'Không tìm thấy phản hồi để xóa.' });
        return;
      }
      writeStore(store);
      res.json({ deletedId: id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi xóa phản hồi';
      res.status(500).json({ error: message });
    }
  });

  // Synthesize recurring themes and long-feedback executive summary via Gemini AI
  app.post('/api/analytics/synthesize', async (req, res) => {
    try {
      const { days = 'all', channel = 'all' } = req.body ?? {};
      const store = readStore();
      const safeDays =
        days === '7' || days === '30' || days === '90' || days === 'all' ? days : 'all';
      const safeChannel =
        channel === 'all' || VALID_CHANNELS.includes(channel) ? channel : 'all';

      const filtered = filterResponses(store.responses, {
        days: safeDays,
        channel: safeChannel,
      });

      const filterDesc = `${safeChannel === 'all' ? 'Tất cả kênh' : safeChannel} · ${
        safeDays === 'all' ? 'Toàn thời gian' : `${safeDays} ngày qua`
      }`;

      const report = await synthesizeAggregateInsightsWithAI(filtered, filterDesc);
      store.lastAggregateReport = report;
      writeStore(store);

      res.json({ report });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Lỗi tổng hợp chủ đề AI';
      res.status(502).json({ error: message });
    }
  });

  // Update campaign configuration
  app.patch('/api/config', (req, res) => {
    try {
      const body = req.body ?? {};
      const store = readStore();
      const updated = {
        ...store.config,
        title: sanitizeText(body.title, 140) || store.config.title,
        welcomeNote: sanitizeText(body.welcomeNote, 400) || store.config.welcomeNote,
        estimatedMinutes: clampInt(
          body.estimatedMinutes,
          1,
          15,
          store.config.estimatedMinutes
        ),
        isActive:
          typeof body.isActive === 'boolean' ? body.isActive : store.config.isActive,
        updatedAt: new Date().toISOString(),
      };
      store.config = updated;
      writeStore(store);
      res.json({ config: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi cập nhật cấu hình';
      res.status(500).json({ error: message });
    }
  });

  // Vite middleware for dev, static dist serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseCX server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
