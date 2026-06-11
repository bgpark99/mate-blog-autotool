import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { category, title, additionalRequests, images } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });

  try {
    const knowledgePath = path.join(process.cwd(), 'api', 'mate-knowledge.json');
    const knowledgeRaw = fs.readFileSync(knowledgePath, 'utf8');
    const mateKnowledge = JSON.parse(knowledgeRaw);

    const ai = new GoogleGenerativeAI(apiKey);
    
    // 🌟 요청하신 gemini-2.5-pro 모델 적용
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });

    let categoryPrompt = '';
    if (category === '도입사례') {
      categoryPrompt = `- [콘셉트]: 도입 매장 인터뷰 및 긍정적 변화 후기\n- [구조]: 매장 소개 -> 도입 배경 -> 만족 기능(Q&A) -> 수치적 변화 -> CTA`;
    } else if (category === '메이트소식') {
      categoryPrompt = `- [콘셉트]: 신기능 업데이트 및 사용 가이드\n- [구조]: 핵심 요약 -> 변경 사항(리스트) -> 점주 혜택`;
    } else if (category === '메이트TV') {
      categoryPrompt = `- [콘셉트]: 유튜브 영상 콘텐츠 요약 및 미러링\n- [구조]: 영상 주제/포인트 -> 핵심 타임라인 요약 -> 영상 링크 유도`;
    } else if (category === '기타') {
      categoryPrompt = `- [콘셉트]: 특정 형식에 얽매이지 않는 범용적이고 자유로운 주제의 블로그 콘텐츠\n- [구조]: 검색 의도(AEO/SEO)를 충족하는 논리적인 흐름으로 자유롭게 구성`;
    }

    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE
