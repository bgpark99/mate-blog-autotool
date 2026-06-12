import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// 🌟 Vercel 서버 충돌을 일으키던 불필요한 export 설정(maxDuration, config)을 삭제했습니다.

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

    const contentBestPractice = `
    [본문 작성 기준(Gold Standard)] - 이 흐름과 스타일, 태그 계층(H2, H3), 이모지 사용법을 철저히 벤치마킹하세요.
    
    안정적인 매장 운영을 자랑하는 대형 프랜차이즈일수록 태블릿오더와 포스 도입 기준은 훨씬 까다롭습니다. 복잡한 메뉴 조합부터 완벽한 주문 연동까지, 피자알볼로 목동 본점이 깐깐한 비교 끝에 메이트를 선택한 이유를 생생한 설치 현장을 통해 낱낱이 파헤쳐 드립니다. 매장 효율을 높이고 인건비 고민을 덜어줄 확실한 힌트를 확인해 보세요.🍕

    <h2>피자알볼로 목동 본점, 꼼꼼한 설치가 중요한 이유</h2>
    <p>본점은 브랜드의 얼굴이자 모든 매장의 표준이 됩니다. 따라서 태블릿오더 설치 역시 단순한 기기 배치를 넘어, 매장 동선 최적화와 시스템 안정성에 가장 큰 초점을 맞추어야 합니다.</p>
    <img src="IMAGE_0" alt="메이트 태블릿오더를 도입한 피자알볼로 목동 본점 전경">
    <p>설치 당일, 메이트 설치팀은 피자알볼로 매장의 테이블 구조와 주방 동선을 면밀히 파악했습니다.<br>주문이 몰리는 피크 타임에도 데이터 병목 현상 없이 주문서가 주방으로 즉시 전송될 수 있도록, 메이트 포스(POS)와의 실시간 동기화를 최우선으로 작업했습니다. 🖥️</p>
    <img src="IMAGE_1" alt="피자알볼로 매장에 설치된 메이트 태블릿오더와 포스 연동 모습">

    <h2>프랜차이즈가 극찬한 메이트만의 3가지 차별점</h2>
    <p>그렇다면 수많은 업체를 꼼꼼하게 비교한 피자알볼로가 결국 메이트 태블릿오더를 선택한 결정적 포인트는 무엇일까요?</p>

    <h3>1. 꼼꼼하고 친절한 설치 및 테스트</h3>
    <p>메이트 설치팀은 단순히 기기만 툭 올려두고 가는 것이 아닙니다. 직원의 이동 동선과 고객의 시선까지 고려한 세심한 맞춤형 설치, 그리고 실전과 같은 철저한 연동 테스트를 통해 오픈 직후의 혼선을 완벽하게 차단합니다.</p>
    <img src="IMAGE_2" alt="메이트 포스와 태블릿오더로 피자알볼로 메뉴 주문을 테스트하는 모습">

    <h3>2. 잔고장 걱정을 덜어주는 삼성 정품 태블릿</h3>
    <p>저가형 기기 사용으로 인한 잦은 고장은 곧바로 매장의 매출 손실로 이어집니다. 메이트는 검증된 삼성 정품 태블릿만을 사용하여 기기 고장에 대한 사장님들의 걱정을 덜어드리고, 고객의 사용성을 크게 높였습니다.</p>

    <h3>3. 복잡한 메뉴도 한눈에 들어오는 직관적인 UI</h3>
    <p>피자의 특성상 도우 변경, 사이즈, 복잡한 토핑 추가 등 선택해야 할 옵션이 매우 많습니다. 메이트는 고객 누구나 고민 없이 쉽게 터치하고 고를 수 있는 가장 직관적이고 편안한 화면 구성을 제공합니다. 🍕</p>

    <h2>매장 효율화의 시작, 메이트와 함께하세요</h2>
    <p>피자알볼로 목동 본점 사장님께서 크게 만족하신 그 서비스, 이제 사장님의 매장에서도 똑같이 경험하실 수 있습니다. 인건비 고민은 확실하게 덜고 매출은 높이는 가장 스마트한 방법, 메이트가 든든하게 제시해 드립니다. 🤝</p>
    `;

    const systemPrompt = `
    당신은 매장 솔루션 브랜드 'MATE(메이트)'의 수석 브랜드 마케터이자 SEO/AEO 전문가입니다.
    아래 [MATE 지식 베이스]와 [우수 콘텐츠 예시]를 숙지하고 아임웹 블로그용 최적화 콘텐츠를 HTML로 작성하세요.

    [MATE 지식 베이스]
    ${mateKnowledge.brandOverview}
    - 톤앤매너: ${mateKnowledge.toneAndManner}
    - 발행 규칙: ${mateKnowledge.publishingRules.join(' ')}

    [작성 필수 규칙]
    1. 반드시 <body> 태그 내부의 순수 HTML 요소(<h1>, <h2>, <h3>, <p>, <ul> 등)만 출력하세요.
    
    2. [제목(H1) 작성 규칙]:
       - 다음 20개의 우수 제목을 분석하고 모방하세요: ${titleBestPractices}
       - '[매장 혁신]', '[꿀팁]' 등 인위적인 대괄호 수식어 절대 사용 금지.
       - 핵심 서비스 키워드(태블릿오더, QR오더 등)와 매장명 반드시 포함.
    
    3. [디자인 및 문단 구조 (매우 중요)]:
       - 제공된 [본문 작성 기준(Gold Standard)]를 철저히 벤치마킹하세요:
       ${contentBestPractice}
       - 위 예시처럼 H2, H3 태그를 위계에 맞게 사용하고, 자연스러운 문맥에 맞춰 이모지를 사용하세요.
       - 중요한 문장이나 기대효과는 <strong> 태그나 <span style="background-color: #FCF56A;"> 등으로 시각적 강조를 더하세요.

    4. [동적 AEO 맞춤 Q&A 생성]: 현재 글의 핵심 주제에 맞춰 실제 사장님들이 네이버/구글에 검색할 법한 실질적인 질문/답변 구조를 본문 중간에 창작하세요.
    
    5. [이미지 및 하단 CTA 버튼 처리 (매우 엄격함!)]: 
       - 총 ${images.length}장의 이미지가 업로드되었습니다. (확장자 추가 금지)
       - '도입 상담 받기', '더 알아보기' 등의 버튼 이미지는 반드시 글의 맨 마지막에 배치하되, **버튼 이미지끼리 연달아 붙이지 마세요.**
       - 아래 [구조 예시]를 반드시 그대로 따르세요:
         <p>👇 우리 매장 맞춤형 메이트 솔루션 무료 컨설팅 신청하기 👇</p>
         <img src="버튼이미지1_INDEX" alt="도입 상담 받기">
         <br>
         <p>👇 메이트 솔루션의 더 많은 장점과 도입 사례 확인하기 👇</p>
         <img src="버튼이미지2_INDEX" alt="더 알아보기">

    6. [엄격한 Alt 태그]: '이미지', '사진', '버튼' 이라는 단어는 절대 포함하지 마세요.
    
    7. [내부 링크]: <p>👉 <a href="#" target="_blank">[여기에 매력적인 클릭 유도 문구 작성]</a></p> 형태로 본문 내에 자연스럽게 삽입하세요.
    
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
    const cleanHtml = responseText.replace(/```html/g, '').replace(/
```/g, '').trim();

    return res.status(200).json({ html: cleanHtml });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '오류 발생: ' + error.message });
  }
}
