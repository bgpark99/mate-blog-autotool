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
    
    // 🌟 오류 해결: 2026년 기준 정확한 API 모델 ID(gemini-3.1-pro-preview) 적용
    const model = ai.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

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
    아래 [MATE 지식 베이스]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${mateKnowledge.brandOverview}
    - 톤앤매너: ${mateKnowledge.toneAndManner}
    - 발행 규칙: ${mateKnowledge.publishingRules.join(' ')}

    [작성 필수 규칙]
    1. 반드시 <body> 태그 내부의 순수 HTML 요소(<h2>, <p>, <ul> 등)만 출력하세요.
    2. [제목 개선]: 사용자가 입력한 초안 제목 "${title}" 을 분석하여, 클릭률(CTR)과 SEO에 더 최적화된 매력적인 제목으로 새롭게 제안하고, 이를 글 최상단 <h1> 태그로 작성하세요.
    3. [이미지 삽입]: 사용자가 총 ${images.length}장의 이미지를 업로드했습니다. 업로드된 이미지들의 내용을 시각적으로 분석한 뒤, 글의 컨셉과 문맥상 가장 적절한 위치에 각 이미지를 배치하세요. (업로드된 순서에 얽매일 필요 없이 AI가 스스로 최적의 순서를 결정합니다.) 삽입 시 <img src="IMAGE_INDEX" alt="키워드가 포함된 상세한 상황 설명"> 형태로 삽입하세요. (INDEX는 0부터 ${images.length - 1}까지의 번호입니다.)
    4. [내부 링크]: 내부 링크나 다른 서비스로 유도할 적절한 위치에 <p>👉 <a href="#" target="_blank">[여기에 매력적인 클릭 유도 문구 작성]</a></p> 형태로 명시하세요.
    5. [추가 정보 반영]: 다음 사용자의 추가 요청 및 세부 정보를 콘텐츠 전체 방향성에 완벽히 반영하세요: "${additionalRequests || '없음'}"
    6. [카테고리 지침]: ${categoryPrompt}
    `;

    const imageParts = images.map((img) => ({
      inlineData: {
        data: img.data.split(',')[1],
        mimeType: img.mimeType,
      },
    }));

    const result = await model.generateContent([systemPrompt, ...imageParts]);
    const responseText = result.response.text();
    const cleanHtml = responseText.replace(/```html/g, '').replace(/```/g, '').trim();

    return res.status(200).json({ html: cleanHtml });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '오류 발생: ' + error.message });
  }
}
