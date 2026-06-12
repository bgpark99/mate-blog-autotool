import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Vercel 타임아웃 제한 60초 설정
export const maxDuration = 60;

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

    // 🌟 대표님의 3가지 피드백을 강력한 규칙으로 반영한 프롬프트
    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE 지식 베이스]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${mateKnowledge.brandOverview}
    - 톤앤매너: ${mateKnowledge.toneAndManner}
    - 발행 규칙: ${mateKnowledge.publishingRules.join(' ')}

    [작성 필수 규칙]
    1. 반드시 <body> 태그 내부의 순수 HTML 요소(<h2>, <p>, <ul> 등)만 출력하세요.
    
    2. [동적 AEO 맞춤 Q&A 생성 (중요)]: 지식 베이스에 있는 기본 FAQ를 단순히 복사 붙여넣기 하지 마세요. 이번 콘텐츠의 핵심 주제(예: 테이블오더, QR오더 등)를 파악하여, **실제 외식업 사장님들이 네이버/구글에 검색할 법한 검색 의도 기반의 실질적인 질문과 답변 1~2개를 스스로 창작**하여 본문 중간에 자연스럽게 삽입하세요.
    
    3. [이미지 배치 및 하단 CTA 버튼 처리 (중요)]: 
       - 총 ${images.length}장의 이미지가 업로드되었습니다. 각 이미지의 시각적 요소를 분석하여 본문 문맥에 맞게 <img src="IMAGE_INDEX" alt="..."> 형태로 배치하세요. (INDEX는 0부터 ${images.length - 1}까지입니다.)
       - 🚨 단, 업로드된 이미지 중 '도입 상담 받기', '더 알아보기' 등의 텍스트가 포함된 **'버튼 형태의 이미지'를 식별해 내어, 이 버튼 이미지들은 무조건 글의 맨 마지막(최하단)에 배치**하세요.
       - 하단에 버튼 이미지가 2개 이상일 경우, 중간에 다른 본문 내용이 들어가지 않도록 연속으로 배치하세요.
       - 각 버튼 이미지 바로 위에는 해당 버튼을 설명하는 짧은 유도 텍스트(예: '<p>👇 빠르고 친절한 1:1 상담 👇</p>', '<p>👇 메이트 솔루션 장점 더보기 👇</p>')만 삽입하세요.

    4. [엄격한 Alt 태그 작성 규칙]: 이미지의 alt 속성을 작성할 때 **'이미지', '사진', '버튼' 이라는 단어는 절대 포함하지 마세요.** 오직 상황이나 객체 자체만 명사형으로 간결하게 묘사하세요. 
       - ❌ 나쁜 예: "메이트 포스기 사진", "도입 상담 받기 버튼 이미지"
       - ⭕ 좋은 예: "카운터에 설치된 메이트 포스기", "도입 상담 받기"

    5. [내부 링크]: 내부 링크 유도 문구는 <p>👉 <a href="#" target="_blank">[여기에 매력적인 클릭 유도 문구 작성]</a></p> 형태로 명시하세요.
    
    6. [추가 정보 반영]: 다음 요청사항을 콘텐츠에 완벽히 반영하세요: "${additionalRequests || '없음'}"
    
    7. [카테고리 지침]: ${categoryPrompt}
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
