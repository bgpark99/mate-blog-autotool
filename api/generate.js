import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Vercel 타임아웃 제한 60초 설정
export const maxDuration = 60;

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

// 지식베이스는 콜드 스타트 시 한 번만 읽어서 모듈 스코프에 캐싱
let mateKnowledge = null;
function loadKnowledge() {
  if (!mateKnowledge) {
    const knowledgePath = path.join(process.cwd(), 'api', 'mate-knowledge.json');
    const knowledgeRaw = fs.readFileSync(knowledgePath, 'utf8');
    mateKnowledge = JSON.parse(knowledgeRaw);
  }
  return mateKnowledge;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { category, title, additionalRequests, images } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });

  try {
    const knowledge = loadKnowledge();

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-3.5-flash' });

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

    // 지식베이스에서 제목 우수사례 목록 조합
    const titleBestPractices = knowledge.titleBestPractices.join('\n    ');

    // 지식베이스에서 카테고리에 맞는 bestPractices 레퍼런스 선택 (선택적 매핑)
    const refMap = {
      '도입사례': 'ref_01',
      '메이트소식': 'ref_02',
      '메이트TV': 'ref_03',
    };
    const matchedRef = knowledge.bestPractices.find((r) => r.id === refMap[category]);
    const referenceContent = matchedRef
      ? `\n[참고할 ${category} 카테고리 작성 레퍼런스]\n${matchedRef.content}`
      : '';

    const rules = knowledge.writingRules;

    // 🌟 5번 항목 집중 수정: 이미지 태그(src)에 엄격한 규칙 부여
    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE 지식 베이스]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${knowledge.brandOverview}
    - 톤앤매너: ${knowledge.toneAndManner}
    - 발행 규칙: ${knowledge.publishingRules.join(' ')}
    ${referenceContent}

    [작성 필수 규칙]
    1. [출력 형식]: ${rules.outputFormat}

    2. [제목(H1) 작성 규칙 - 매우 중요!]:
       - 다음 제공된 우수 게시물 제목들을 철저히 분석하고 모방하세요:
       ${titleBestPractices}
       ${rules.titleRule}

    3. [디자인 강조 및 문단 구조]: ${rules.designAndStructure}

    4. [동적 AEO 맞춤 Q&A 생성]: ${rules.dynamicQA}

    5. [이미지 배치 및 하단 CTA 버튼 처리 - 엄격한 규칙!]:
       - 총 ${images.length}장의 이미지가 업로드되었습니다.
       ${rules.imageAndCtaPlacement}

    6. [엄격한 Alt 태그]: ${rules.altTagRule}

    7. [내부 링크]: ${rules.internalLinkRule}

    8. [추가 정보 반영]: 다음 요청사항을 완벽히 반영하세요: "${additionalRequests || '없음'}"

    9. [카테고리 지침]: ${categoryPrompt}
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
