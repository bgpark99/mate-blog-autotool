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

    // 🌟 대표님이 제공한 20개의 우수 제목 데이터 삽입
    const titleBestPractices = `
    QR오더 솔직후기: 성수닭꼬치 사장님이 메이트를 추천하는 이유
    안암역 맛집 비테라스는 어떻게 테이블오더로 인건비를 줄였을까?
    "이자카야에 QR오더는 안 어울린다?" 일상동경의 반전 사용 후기
    메이트 QR오더 사용 후기: 17년 전통 피자 맛집의 디지털 전환기
    일미리금계찜닭이 메이트 QR오더를 선택한 이유 5가지
    디저트카페 창업 필수템! QR오더 설치부터 활용까지 완벽 가이드
    샐러디아 양재점의 주문 속도가 2배 빨라진 비결은 '이것'
    태블릿오더 매장 효율 가이드: 인천 밀겨울의 인건비 절약 사례
    태블릿오더 도입 시 고려할 점, 7년 차 닭발 맛집의 솔직한 답변
    웨이팅 맛집 카페동이의 선택: 일반 진동벨 vs 메이트 태블릿오더
    QR오더 점심시간 활용법: 아사이퍼플 삼성점의 주문 대기 해소법
    테이블오더 설치가 인테리어를 해칠까? 이태원 웍스터의 반전 사례
    뮤지컬펍 송스루가 QR오더와 테이블오더를 동시에 도입한 이유
    대형 매장 운영 효율 높이는 QR오더, 한강 선착장 BBQ 설치 사례
    메이트 QR오더로 현지 감성을? 츠쿠요미 군자점의 공간 활용 전략
    야외 테이블 QR오더 설치 가능할까? 숙성회136 매장 사례
    테이블오더 50대 설치 사례: 메이트의 대형 매장 도입기
    국밥집 회전율 전쟁: 일반 주문 vs 메이트 테이블오더 승자는?
    맹호수제돈까스가 메이트 테이블오더로 주문 혁신을 이룬 방법
    태블릿오더로 주문부터 픽업까지! 셀러브리티버거의 원스톱 운영 전략
    `;

    // 🌟 5번 항목 집중 수정: 이미지 태그(src)에 엄격한 규칙 부여
    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE 지식 베이스]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${mateKnowledge.brandOverview}
    - 톤앤매너: ${mateKnowledge.toneAndManner}
    - 발행 규칙: ${mateKnowledge.publishingRules.join(' ')}

    [작성 필수 규칙]
    1. 반드시 <body> 태그 내부의 순수 HTML 요소(<h1>, <h2>, <h3>, <p>, <ul> 등)만 출력하세요.
    
    2. [제목(H1) 작성 규칙 - 매우 중요!]:
       - 다음 제공된 20개의 실제 우수 게시물 제목을 철저히 분석하고 모방하세요:
       ${titleBestPractices}
       - 🚨 '[매장 혁신]', '[운영 꿀팁]' 같이 검색자가 절대 검색하지 않을 무의미한 대괄호 수식어는 **절대 사용하지 마세요.**
       - 🚨 사용자가 입력한 초안에서 가장 중요한 '핵심 서비스 키워드(예: 태블릿오더, 테이블오더, QR오더, 포스)'와 '매장명'은 제목에 **무조건 포함**시켜야 합니다. 누락하면 안 됩니다.
    
    3. [디자인 강조 및 문단 구조]:
       - 본문 작성 시 H2, H3, H4 태그를 활용해 단락을 명확히 나누세요.
       - 중요한 문장이나 핵심 기대효과는 <strong> 태그나 <span style="background-color: #FCF56A;"> 등을 적극 활용해 시각적으로 강조하세요.

    4. [동적 AEO 맞춤 Q&A 생성]: 지식 베이스의 FAQ를 복붙하지 마세요. 현재 글의 핵심 주제(예: 테이블오더)에 맞춰 실제 사장님들이 네이버/구글에 검색할 법한 실질적인 질문과 답변 구조를 본문 중간에 창작하세요.
    
    5. [이미지 배치 및 하단 CTA 버튼 처리 - 엄격한 규칙!]: 
       - 총 ${images.length}장의 이미지가 업로드되었습니다.
       - 🚨 모든 이미지의 src 속성은 무조건 'IMAGE_0', 'IMAGE_1', 'IMAGE_2' 처럼 대문자 'IMAGE_'와 숫자 조합으로만 작성하세요. (절대 .jpg, .png 확장자나 다른 단어를 붙이지 마세요!)
       - 🚨 '도입 상담 받기', '더 알아보기' 등의 버튼 이미지는 글의 맨 마지막(최하단)에 배치하되, **절대 이미지끼리 연달아 붙이지 마세요.**
       - 🚨 반드시 아래와 같이 [텍스트 -> 버튼 -> 텍스트 -> 버튼] 형태의 구조를 엄격하게 지키세요 (X와 Y에는 알맞은 숫자 인덱스 할당):
         <p>👇 우리 매장 맞춤형 메이트 솔루션 무료 컨설팅 신청하기 👇</p>
         <img src="IMAGE_X" alt="도입 상담 받기">
         <br>
         <p>👇 메이트 솔루션의 더 많은 장점과 도입 사례 확인하기 👇</p>
         <img src="IMAGE_Y" alt="더 알아보기">
       - 유도 텍스트는 버튼의 목적(상담 신청인지, 정보 더보기인지)에 맞게 정확히 구분해서 작성해야 합니다.

    6. [엄격한 Alt 태그]: '이미지', '사진', '버튼' 이라는 단어는 절대 포함하지 마세요. (예: "카운터에 설치된 메이트 포스기", "도입 상담 받기", "더 알아보기")

    7. [내부 링크]: <p>👉 <a href="#" target="_blank">[여기에 매력적인 클릭 유도 문구 작성]</a></p> 형태로 명시하세요.
    
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
