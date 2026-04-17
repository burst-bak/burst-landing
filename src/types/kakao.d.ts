interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  Channel: {
    addChannel(params: { channelPublicId: string }): void;
    createAddChannelButton(params: {
      container: string;
      channelPublicId: string;
      size?: "small" | "large";
    }): void;
  };
}

interface Window {
  Kakao: KakaoStatic;
}
