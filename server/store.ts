import fs from 'fs';
import path from 'path';
import type {
  AggregateAIReport,
  SurveyCampaignConfig,
  SurveyResponse,
} from '../src/types/survey';
import { INITIAL_CAMPAIGN_CONFIG, INITIAL_SURVEY_RESPONSES } from './seedData';

export interface SurveyStoreData {
  config: SurveyCampaignConfig;
  responses: SurveyResponse[];
  lastAggregateReport: AggregateAIReport | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'survey_store.json');

function ensureStoreFile(): SurveyStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: SurveyStoreData = {
      config: INITIAL_CAMPAIGN_CONFIG,
      responses: INITIAL_SURVEY_RESPONSES,
      lastAggregateReport: null,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf-8');
  return JSON.parse(raw) as SurveyStoreData;
}

export function readStore(): SurveyStoreData {
  return ensureStoreFile();
}

export function writeStore(data: SurveyStoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, STORE_PATH);
}

export function generateNextSurveyId(existing: SurveyResponse[]): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const nextSeq = existing.length + 1;
  return `CX-${yy}${mm}-${String(nextSeq).padStart(3, '0')}`;
}
