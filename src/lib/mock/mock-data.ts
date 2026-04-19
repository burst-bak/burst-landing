/**
 * ============================================================================
 * Mock Fixtures — 프론트엔드 단독 개발용 샘플 데이터
 * ============================================================================
 *
 * 백엔드 연동 전까지 mock-api / mock-ws가 참조하는 고정값 묶음.
 * 실제 통합 시 이 파일은 삭제되고 API 호출로 대체됨.
 * ============================================================================
 */

import type { AuthUser } from "@/types/game";

/** 개발 환경 기본 이벤트 id — URL 경로 `/waiting/test-event` 등에서 사용 */
export const DEFAULT_EVENT_ID = "test-event";

/** MVP 단계에서는 기본 로그인 상태 가정 (찬호와 협의한 편의 설정) */
export const MOCK_USER: AuthUser = {
  id: "mock-user-001",
  nickname: "테스트유저",
  kakaoId: "12345678",
};

/** Mock API 호출 시 기본 지연 시간 (ms) — ?mockDelay 파라미터로 오버라이드 가능 */
export const DEFAULT_MOCK_DELAY_MS = 120;

/** 연습 투척 쿨다운 (ms) — 실제 게임 쿨다운과 동일 */
export const SMASH_COOLDOWN_MS = 500;
