"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

/* ── GA4 event helper ── */
function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...(args as [string, ...unknown[]]));
  }
}
function trackEvent(action: string, params?: Record<string, unknown>) {
  gtag("event", action, params);
}

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

/* ──────────────────────────────────────────
   i18n — auto-detect by browser language
   ────────────────────────────────────────── */
const t = {
  ko: {
    headline1: "NO 머니, NO 광고, NO 시간 낭비!",
    headline2: "딸깍으로 돈 벌어보세요!",
    tapHint: "👆 눌러서 던져보세요!",
    thrown: "회 던짐",
    openLabel: "오픈 예정",
    openDate: "5월 5일 · 오후 5시 5분",
    prize: "Vol.1 상금",
    kakaoBtn: "🔔 카카오 채널 추가 → 오픈 알림 받기",
    whatIsThis: "자세히 보기",
    collapse: "접기",
    infoTitle: "작년 산타 출근시키기 게임, 기억하십니까?",
    infoLines: [
      "만원 준다고, 얼굴에 철판 깔고 링크 공유하게 시킨 그 게임.",
      "결국 주변에 받은 사람도 없고, 나만 민망했던 그 게임.",
      "우리가 고작 1만 원, 5천 원 때문에 이러는 겁니까?",
      "아닙니다. 우리의 시간이 더 중요하고, 우리의 자존심이, 관계가 더 소중한데 — 그걸 어물쩡 빼가니까 분개한 겁니다.",
    ],
    infoDeal: "그래서 만들었습니다.",
    infoUs: "",
    infoYou: "",
    infoBottom: [
      "딱 3초. 유튜브처럼 짜치게 광고로 앞길 막지 않겠습니다. 귀찮게 쓸데없는 홍보용 알림 보내지 않겠습니다.",
      "그리고, 약간의 재미와 큰 상금을 드리겠습니다.",
      "1만 원... 5만 원... 10만 원... 100만 원. 반응 보고 가겠습니다. 잘 되면 그 이상까지도.",
      "이걸로 버는 만큼 다 상금으로 돌려드리겠습니다.",
    ],
    infoWhy: "왜 이걸 하냐고요?",
    infoWhyLines: [
      "백엔드 개발자는 한정된 자원으로 많은 요청을 처리하는 법을 평생 공부합니다.",
      "여러분의 딸깍 하나가, 저희에겐 실전 트래픽 경험이 됩니다.",
      "저희는 경험을 얻고, 여러분은 상금을 얻고. 윈-윈.",
      "그리고 약간의 재미도 드리고 싶어서 — 재밌는 기획을 많이 준비했습니다. 잘 되면 다 보여드릴 수 있으면 좋겠네요.",
    ],
    infoSecurity: "🔒 개인정보",
    infoSecurityLines: [
      "민감한 만큼, 아마추어같지 않게 암호화 처리 2중 3중으로 해두었습니다.",
      "얼굴 걸고 하는 만큼 자신 있습니다.",
      "보안 관련 상세 내용은 인스타·유튜브 공식 계정 'burst-박 터트리기'에 올라갈 예정입니다.",
    ],
    infoTransparency: "📋 당첨 & 투명성",
    infoTransparencyLines: [
      "상금 당첨 여부는 투명하게 공개하겠습니다.",
      "당첨되신 분은 따로 연락드리겠습니다.",
      "공정한 로그 기록, 실제로 까서 사람 찾아서 전달하는 과정까지 — 영상으로 담아서 올리겠습니다.",
    ],
    infoClosing: "가벼운 마음으로 오셔서, 사소한 재미 받으시고 가실 수 있도록 최선을 다하겠습니다.\n\n— BURST —",
    share: "📋 링크 복사해서 친구에게 공유",
    copied: "✅ 복사 완료!",
  },
  en: {
    headline1: "NO money, NO ads, NO time wasted!",
    headline2: "Earn money with a single click!",
    tapHint: "👆 Tap to throw!",
    thrown: " thrown",
    openLabel: "OPENS",
    openDate: "May 5 · 5:05 PM KST",
    prize: "Vol.1 Prize",
    kakaoBtn: "🔔 Get notified on KakaoTalk",
    whatIsThis: "What is this?",
    collapse: "Close",
    infoTitle: "Why are we literally giving away cash?",
    infoLines: [
      "AI is coming for our jobs. Let's be real.",
      "We're junior backend developers trying to survive in this market.",
      "Every company asks: \"Do you have experience handling large-scale traffic?\"",
      "But how? Nobody hires without experience, and you can't get experience without a job. Infinite loop.",
      "So we decided to build it ourselves.",
      "When you click → real traffic hits our server → we get battle-tested experience.",
      "But who's gonna click for free, right?",
    ],
    infoDeal: "So here's our deal.",
    infoUs: "🧑‍💻 We get — real resume-worthy engineering experience",
    infoYou: "🎁 You get — actual cash prizes",
    infoBottom: [
      "Entry fee? Zero. Ads? None. Selling your data? Absolutely not.",
      "Seriously, one click is all it takes.",
      "And the more people join, the bigger the prize pool gets.",
      "Starting at ₩50K → next ₩100K → then... let's grow this together.",
      "The entire draw is recorded and published on Instagram & YouTube. No rigging. Full transparency.",
    ],
    infoClosing: "We mean it. Please, give us one shot. 🙏",
    share: "📋 Copy link & share with friends",
    copied: "✅ Copied!",
  },
  zh: {
    headline1: "零费用，零广告，零浪费时间！",
    headline2: "点一下就能赚钱！",
    tapHint: "👆 点击试试投掷！",
    thrown: "次投掷",
    openLabel: "开放时间",
    openDate: "5月5日 · 下午5:05 KST",
    prize: "Vol.1 奖金",
    kakaoBtn: "🔔 订阅KakaoTalk获取通知",
    whatIsThis: "这是什么？",
    collapse: "收起",
    infoTitle: "为什么我们免费发钱？",
    infoLines: [
      "AI正在威胁我们的工作。",
      "说实话，我们是正在求职的初级后端开发者。",
      "每家公司都问：\"你有处理大规模流量的经验吗？\"",
      "但去哪里获得？不被录用就没有经验，没有经验就不被录用。死循环。",
      "所以我们决定自己创造。",
      "你点击 → 真实流量涌入我们的服务器 → 我们获得实战经验。",
      "但谁会免费来点击呢？",
    ],
    infoDeal: "所以我们提议一个交易。",
    infoUs: "🧑‍💻 我们获得 — 写进简历的实战经验",
    infoYou: "🎁 你获得 — 真金白银的奖金",
    infoBottom: [
      "参与费？零。广告？没有。卖数据？绝不。",
      "真的，点一下就够了。",
      "参与人数越多，奖金池越大。",
      "现在5万→下次10万→之后...一起做大吧。",
      "抽奖过程在Instagram和YouTube全程公开。零操控，完全透明。",
    ],
    infoClosing: "我们是认真的。请给我们一次机会。🙏",
    share: "📋 复制链接分享给朋友",
    copied: "✅ 已复制！",
  },
  ja: {
    headline1: "お金不要、広告なし、時間の無駄なし！",
    headline2: "ワンクリックでお金を稼ごう！",
    tapHint: "👆 タップして投げてみよう！",
    thrown: "回投げた",
    openLabel: "オープン予定",
    openDate: "5月5日 · 午後5:05 KST",
    prize: "Vol.1 賞金",
    kakaoBtn: "🔔 KakaoTalkで通知を受け取る",
    whatIsThis: "これは何？",
    collapse: "閉じる",
    infoTitle: "なぜ無料でお金を配るの？",
    infoLines: [
      "AIが僕たちの仕事を奪おうとしています。",
      "正直に言います。僕たちは生き残りをかけたジュニアバックエンドエンジニアです。",
      "どの会社も聞きます：「大規模トラフィックの経験は？」",
      "でもどこで？採用されなければ経験できない、経験がなければ採用されない。無限ループです。",
      "だから自分たちで作ることにしました。",
      "あなたがクリック → 本物のトラフィックがサーバーに殺到 → 僕たちは実戦経験を積めます。",
      "でもタダでクリックしてくれる人なんていないですよね？",
    ],
    infoDeal: "だからこんな取引を提案します。",
    infoUs: "🧑‍💻 僕たちは — 履歴書に書ける実戦経験を得る",
    infoYou: "🎁 あなたは — 本物の賞金を得る",
    infoBottom: [
      "参加費？ゼロ。広告？なし。データ売却？絶対にしません。",
      "本当にワンクリックだけ。",
      "参加者が増えるほど賞金プールは大きくなります。",
      "今5万→次は10万→その先は...一緒に育てましょう。",
      "抽選過程はInstagramとYouTubeで全て公開します。不正なし、完全透明。",
    ],
    infoClosing: "本気です。一度だけ信じてください。🙏",
    share: "📋 リンクをコピーして友達にシェア",
    copied: "✅ コピー完了！",
  },
  th: {
    headline1: "ไม่เสียเงิน ไม่มีโฆษณา ไม่เสียเวลา!",
    headline2: "คลิกเดียวก็หาเงินได้!",
    tapHint: "👆 แตะเพื่อขว้าง!",
    thrown: " ครั้ง",
    openLabel: "เปิด",
    openDate: "5 พ.ค. · 17:05 KST",
    prize: "Vol.1 รางวัล",
    kakaoBtn: "🔔 รับแจ้งเตือนผ่าน KakaoTalk",
    whatIsThis: "นี่คืออะไร?",
    collapse: "ปิด",
    infoTitle: "ทำไมเราถึงแจกเงินฟรี?",
    infoLines: [
      "AI กำลังคุกคามงานของพวกเรา",
      "พูดตรงๆ เราเป็น Junior Backend Developer ที่กำลังดิ้นรน",
      "ทุกบริษัทถามว่า: \"มีประสบการณ์รับมือ Traffic ขนาดใหญ่ไหม?\"",
      "แต่จะหาจากไหน? ไม่รับก็ไม่มีประสบการณ์ ไม่มีประสบการณ์ก็ไม่รับ วนลูปไม่จบ",
      "เลยตัดสินใจสร้างเอง",
      "คุณคลิก → Traffic จริงถล่มเซิร์ฟเวอร์ → เราได้ประสบการณ์จริง",
      "แต่ใครจะมาคลิกฟรีล่ะ?",
    ],
    infoDeal: "เลยเสนอข้อตกลงนี้",
    infoUs: "🧑‍💻 เราได้ — ประสบการณ์จริงใส่ Resume",
    infoYou: "🎁 คุณได้ — เงินรางวัลจริงๆ",
    infoBottom: [
      "ค่าสมัคร? ไม่มี โฆษณา? ไม่มี ขายข้อมูล? ไม่มีทาง",
      "จริงๆ แค่คลิกเดียว",
      "ยิ่งคนเยอะ รางวัลยิ่งใหญ่",
      "ตอนนี้ 5หมื่น → ครั้งหน้า 1แสน → ต่อไป... มาโตไปด้วยกัน",
      "ขั้นตอนจับรางวัลเผยแพร่บน IG & YouTube ทั้งหมด โปร่งใส 100%",
    ],
    infoClosing: "เราจริงจัง ขอโอกาสสักครั้ง 🙏",
    share: "📋 คัดลอกลิงก์แชร์ให้เพื่อน",
    copied: "✅ คัดลอกแล้ว!",
  },
  vi: {
    headline1: "KHÔNG mất tiền, KHÔNG quảng cáo, KHÔNG lãng phí!",
    headline2: "Kiếm tiền chỉ với một cú click!",
    tapHint: "👆 Chạm để ném thử!",
    thrown: " lần ném",
    openLabel: "MỞ CỬA",
    openDate: "5/5 · 5:05 PM KST",
    prize: "Vol.1 Giải thưởng",
    kakaoBtn: "🔔 Nhận thông báo qua KakaoTalk",
    whatIsThis: "Đây là gì?",
    collapse: "Đóng",
    infoTitle: "Tại sao chúng tôi tặng tiền miễn phí?",
    infoLines: [
      "AI đang đe dọa công việc của chúng tôi.",
      "Thật lòng nhé. Chúng tôi là Junior Backend Developer đang cố sống sót.",
      "Công ty nào cũng hỏi: \"Bạn có kinh nghiệm xử lý traffic lớn không?\"",
      "Nhưng lấy đâu ra? Không tuyển thì không có kinh nghiệm, không có kinh nghiệm thì không tuyển. Vòng lặp vô tận.",
      "Nên chúng tôi quyết định tự tạo.",
      "Bạn click → traffic thật đổ vào server → chúng tôi có kinh nghiệm thực chiến.",
      "Nhưng ai click miễn phí bao giờ?",
    ],
    infoDeal: "Vì vậy, đây là thỏa thuận.",
    infoUs: "🧑‍💻 Chúng tôi nhận — kinh nghiệm thực tế cho CV",
    infoYou: "🎁 Bạn nhận — tiền thưởng thật",
    infoBottom: [
      "Phí tham gia? Không. Quảng cáo? Không. Bán dữ liệu? Tuyệt đối không.",
      "Thật sự, chỉ cần một click.",
      "Càng nhiều người tham gia, giải thưởng càng lớn.",
      "Bắt đầu 50K → tiếp theo 100K → rồi... cùng nhau phát triển nhé.",
      "Quá trình rút thăm được công khai trên IG & YouTube. Minh bạch 100%.",
    ],
    infoClosing: "Chúng tôi nói thật. Hãy cho chúng tôi một cơ hội. 🙏",
    share: "📋 Sao chép link chia sẻ cho bạn bè",
    copied: "✅ Đã sao chép!",
  },
} as const;

type Lang = keyof typeof t;

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "ko";
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("zh")) return "zh";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("th")) return "th";
  if (nav.startsWith("vi")) return "vi";
  return "en"; // fallback
}

/* ──────────────────────────────────────────
   Component
   ────────────────────────────────────────── */
interface FlyingCookie {
  id: number;
  startX: number;
}

export default function LandingPage() {
  const kakaoChannelUrl = "https://pf.kakao.com/_sTjCX";
  const [lang, setLang] = useState<Lang>("ko");
  const [cookies, setCookies] = useState<FlyingCookie[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const nextId = useRef(0);

  const L = t[lang];

  // UTM 파라미터 수집
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source");
    if (source) {
      trackEvent("utm_landing", { utm_source: source, utm_medium: params.get("utm_medium"), utm_campaign: params.get("utm_campaign") });
    }
  }, []);

  // TODO: 비즈니스 채널 심사 통과 후 SDK 공식 버튼으로 전환

  const throwCookie = useCallback(() => {
    const id = nextId.current++;
    const startX = Math.random() * 60 - 30;
    setCookies((prev) => [...prev, { id, startX }]);
    setTouchCount((c) => {
      const next = c + 1;
      trackEvent("bak_touch", { touch_count: next });
      return next;
    });
    setTimeout(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 350);
      setCookies((prev) => prev.filter((c) => c.id !== id));
    }, 400);
  }, []);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      trackEvent("share_link");
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return (
    <main
      className="relative flex flex-col items-center w-full min-h-screen cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        if ((e.target as HTMLElement).closest("a")) return;
        throwCookie();
      }}
    >
      {/* ── 운동장 가기 버튼 (우측 상단 고정 — v2.1 확정) ── */}
      <Link
        href="/waiting/test-event"
        onClick={() => trackEvent("cta_playground_enter")}
        className="fixed z-50 rounded-full px-4 py-2 text-sm font-bold text-white
                   bg-gradient-to-b from-[#6DD4C8] via-[#5BBFB5] to-[#3D9E94]
                   border border-[#3D9E94]/40
                   shadow-[0_4px_12px_rgba(61,158,148,0.35)]
                   active:scale-95 transition-transform
                   flex items-center gap-1.5"
        style={{
          top: "calc(env(safe-area-inset-top) + 12px)",
          right: "12px",
        }}
      >
        <span>운동장 가기</span>
        <span aria-hidden>→</span>
      </Link>

      {/* ── flying sand bags (absolute, 화면 중앙 기준) ── */}
      <AnimatePresence>
        {cookies.map((cookie) => (
          <motion.div
            key={cookie.id}
            className="fixed top-[45%] left-[50%] z-30 pointer-events-none"
            initial={{ y: 80, x: cookie.startX, scale: 1, opacity: 1 }}
            animate={{ y: -200, x: cookie.startX * 0.3, scale: 0.4, opacity: 0, rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Image
              src="/sand-bag.png"
              alt="모래주머니"
              width={60}
              height={60}
              className="w-10 sm:w-12 md:w-14 h-auto"
              draggable={false}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          박 + 날짜 + 카피 + CTA — 자연 흐름
          ══════════════════════════════════════ */}
      <div className="flex flex-col items-center w-full max-w-lg mx-auto px-6 pt-0 pb-6 gap-[2vw]">

        {/* ── 박 ── */}
        <motion.div
          className="relative z-10 flex flex-col items-center -mt-4"
          animate={
            isShaking
              ? { rotate: [0, -6, 6, -4, 4, -2, 2, 0], x: [0, -4, 4, -3, 3, -1, 1, 0] }
              : { rotate: 0, x: 0 }
          }
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Image
            src="/bak.png"
            alt="박"
            width={680}
            height={941}
            className="select-none drop-shadow-2xl w-[156%] sm:w-[137%] md:w-[110%] max-w-[910px] h-auto"
            style={{ transform: "perspective(500px) rotateX(-5deg) translateX(-4%)" }}
            priority
            draggable={false}
          />

          {/* impact */}
          <AnimatePresence>
            {isShaking && (
              <motion.div
                key="impact"
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <span className="text-5xl sm:text-6xl">💥</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── 오픈 날짜 ── */}
        <Image
          src="/open-date-design.png"
          alt="5월 5일 5후 5시"
          width={1085}
          height={292}
          className="select-none w-[70%] sm:w-[60%] md:w-[50%] max-w-[380px] h-auto -mt-[25vw] sm:-mt-[18vw] md:-mt-[12vw]"
          draggable={false}
        />

        {/* ── 메인 카피 ── */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-center leading-snug text-stone-800">
          {L.headline1}
          <br />
          <span className="text-red-500">{L.headline2}</span>
        </h1>

        {/* ── 모래주머니 힌트 / 카운터 ── */}
        {/* 발사 버튼 (모바일: 이 버튼으로 던짐 / 데스크톱: 화면 클릭도 가능) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            throwCookie();
          }}
          className="relative z-40 flex flex-col items-center gap-1 active:scale-90 transition-transform mt-4 -translate-x-2 touch-manipulation"
        >
          <motion.div
            animate={touchCount === 0 ? { scale: [1, 1.15, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <Image
              src="/sand-bag.png"
              alt="모래주머니"
              width={60}
              height={60}
              className="w-14 sm:w-16 h-auto drop-shadow-md pointer-events-none"
              draggable={false}
            />
          </motion.div>
          <span className="text-xs text-stone-400">
            {touchCount === 0 ? L.tapHint : `🫘 ${touchCount}${L.thrown}`}
          </span>
        </button>

        {/* ── 사전 알림 안내 ── */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <p className="text-base sm:text-lg font-extrabold text-[#1C1917]">
            🔔 사전 오픈 알림 받기
          </p>
          <span className="text-xl animate-bounce">👇</span>
        </div>

        {/* ── 카카오 채널 추가 버튼 (링크 방식) ── */}
        <a
          href="https://pf.kakao.com/_sTjCX/friend"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            trackEvent("kakao_channel_click");
          }}
          className="flex w-full py-3 sm:py-4 rounded-xl bg-[#FEE500] text-[#191919] font-bold text-base sm:text-lg shadow-md hover:bg-[#FDD835] active:scale-95 transition-all items-center justify-center gap-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C6.477 3 2 6.463 2 10.691c0 2.727 1.818 5.127 4.545 6.472-.2.745-.727 2.7-.832 3.118-.131.527.193.52.407.378.168-.111 2.668-1.813 3.747-2.55.695.1 1.41.153 2.133.153 5.523 0 10-3.463 10-7.691C22 6.463 17.523 3 12 3z" fill="#191919"/>
          </svg>
          채널 추가
        </a>

        {/* ── ! 이게 뭔가요 (카카오 버튼 바로 아래, 중앙) ── */}
        <div className="w-full flex flex-col items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfo(!showInfo);
              if (!showInfo) trackEvent("info_expand");
            }}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-stone-300 text-xs font-bold">
              !
            </span>
            <span>{showInfo ? L.collapse : L.whatIsThis}</span>
          </button>

          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden w-full"
              >
                <div className="mt-4 p-5 rounded-2xl bg-stone-50 border border-stone-200/50 text-sm text-stone-600 space-y-3">
                  {/* 도입 — 분노 */}
                  <p className="font-bold text-stone-800 text-lg" style={{ paddingLeft: "1ch" }}>{L.infoTitle}</p>
                  {L.infoLines.map((line, i) => (
                    <p key={i} className={i === 2 ? "font-semibold text-red-500" : i === 3 ? "font-semibold" : ""} style={{ paddingLeft: "2ch", textIndent: i === 0 ? "1ch" : "0" }}>
                      {line}
                    </p>
                  ))}

                  {/* 전환 — 그래서 만들었습니다 */}
                  <p className="text-stone-800 font-bold text-lg pt-6" style={{ paddingLeft: "1ch" }}>{L.infoDeal}</p>
                  {L.infoBottom.map((line, i) => (
                    <p key={i} className={i === 1 || i === 2 ? "font-semibold" : ""} style={{ paddingLeft: "2ch", textIndent: i === 0 ? "1ch" : "0" }}>
                      {line}
                    </p>
                  ))}

                  {/* 왜 — 개발자 경험 */}
                  {"infoWhy" in L && (
                    <>
                      <p className="text-stone-800 font-bold text-base pt-6" style={{ paddingLeft: "1ch" }}>{(L as typeof t.ko).infoWhy}</p>
                      {(L as typeof t.ko).infoWhyLines?.map((line, i) => (
                        <p key={i} style={{ paddingLeft: "2ch", textIndent: i === 0 ? "1ch" : "0" }}>{line}</p>
                      ))}
                    </>
                  )}

                  {/* 보안 */}
                  {"infoSecurity" in L && (
                    <>
                      <p className="text-stone-800 font-bold text-base pt-6" style={{ paddingLeft: "1ch" }}>{(L as typeof t.ko).infoSecurity}</p>
                      {(L as typeof t.ko).infoSecurityLines?.map((line, i) => (
                        <p key={i} style={{ paddingLeft: "2ch", textIndent: i === 0 ? "1ch" : "0" }}>{line}</p>
                      ))}
                    </>
                  )}

                  {/* 투명성 */}
                  {"infoTransparency" in L && (
                    <>
                      <p className="text-stone-800 font-bold text-base pt-6" style={{ paddingLeft: "1ch" }}>{(L as typeof t.ko).infoTransparency}</p>
                      {(L as typeof t.ko).infoTransparencyLines?.map((line, i) => (
                        <p key={i} style={{ paddingLeft: "2ch", textIndent: i === 0 ? "1ch" : "0" }}>{line}</p>
                      ))}
                    </>
                  )}

                  {/* 마무리 */}
                  <p className="text-stone-800 font-bold text-center pt-4 text-base whitespace-pre-line">
                    {L.infoClosing}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 공유 링크 ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            copyLink();
          }}
          className="w-full py-3 rounded-xl bg-white border border-stone-200 text-stone-500 text-sm font-medium hover:bg-stone-50 active:scale-95 transition-all"
        >
          {copied ? L.copied : L.share}
        </button>

        <div className="h-10" />
      </div>
    </main>
  );
}
