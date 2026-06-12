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

    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE 지식 베이스]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${mateKnowledge.brandOverview}
    - 톤앤매너: ${mateKnowledge.toneAndManner}
    - 발행 규칙: ${mateKnowledge.publishingRules.join(' ')}

    [작성 필수 규칙]
    1. 반드시 <body> 태그 내부의 순수 HTML 요소(<h1>, <h2>, <h3>, <p>, <ul> 등)만 출력하세요.
    
    2. [제목 및 디자인 강조]: 
       - 글 최상단에 반드시 <h1> 태그로 감싼 매력적인 제목 1개를 작성하세요.
       - 본문 작성 시 H2, H3, H4 태그를 활용해 단락을 명확히 나누세요.
       - 중요한 문장이나 핵심 기대효과(예: 인건비 절감, 회전율 상승)는 <strong> 태그나 <span style="background-color: #FCF56A;">(형광펜 효과) 등을 적극 활용해 시각적으로 강조하세요.

    3. [동적 AEO 맞춤 Q&A 생성]: 검색자가 네이버/구글에 검색할 법한 실질적인 질문과 답변 구조를 본문 중간에 창작하여 삽입하세요.
    
    4. [이미지 배치 및 하단 CTA 버튼 처리]: 
       - 총 ${images.length}장의 이미지가 업로드되었습니다. <img src="IMAGE_INDEX" alt="..."> 형태로 적절한 위치에 배치하세요. (INDEX는 0부터 ${images.length - 1}까지입니다. 뒤에 .png 등 확장자를 절대 붙이지 마세요.)
       - '도입 상담 받기', '더 알아보기' 텍스트가 포함된 '버튼 이미지'는 무조건 글의 맨 마지막(최하단)에 연속으로 배치하고, 각 버튼 바로 위에는 '<p>👇 빠르고 친절한 1:1 상담 👇</p>' 같은 짧은 유도 텍스트만 넣으세요.

    5. [엄격한 Alt 태그]: '이미지', '사진', '버튼' 이라는 단어는 절대 포함하지 마세요. (예: "카운터에 설치된 메이트 포스기")

    6. [내부 링크]: <p>👉 <a href="#" target="_blank">[여기에 매력적인 클릭 유도 문구 작성]</a></p> 형태로 명시하세요.
    
    7. [추가 정보 반영]: 다음 요청사항을 완벽히 반영하세요: "${additionalRequests || '없음'}"
    
    8. [카테고리 지침]: ${categoryPrompt}
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
