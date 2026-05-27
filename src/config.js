export const appConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "",
  },
  defaultRoomCode: import.meta.env.VITE_CABIN_ROOM_CODE || "hanyue-2026",
  people: {
    me: import.meta.env.VITE_CABIN_ME_NAME || "小涵涵",
    ta: import.meta.env.VITE_CABIN_TA_NAME || "小越越",
  },
};

export const quickEncouragements = [
  "给你一颗小星星",
  "把小毯子递给你",
  "今天已经很好了",
  "慢慢来，我也在",
  "先喝口水",
  "抱抱，不用解释",
];

export const energyOptions = [
  {
    key: "joyful",
    label: "很开心",
    icon: "star",
    tone: "warm",
  },
  {
    key: "tired",
    label: "有点累",
    icon: "cloud",
    tone: "leaf",
  },
  {
    key: "annoyed",
    label: "烦烦的",
    icon: "raindrop",
    tone: "lavender",
  },
  {
    key: "hug",
    label: "想被抱抱",
    icon: "bear",
    tone: "warm",
  },
  {
    key: "quiet",
    label: "想安静一下",
    icon: "moon",
    tone: "soft",
  },
  {
    key: "okay",
    label: "今天还不错",
    icon: "cat",
    tone: "leaf",
  },
  {
    key: "silent",
    label: "不想说话但想被陪着",
    icon: "cloud",
    tone: "soft",
  },
];

export const messageTypes = [
  {
    key: "today",
    label: "今天想对你说",
    prefix: "今天想对你说：",
  },
  {
    key: "night",
    label: "睡前放一张纸条",
    prefix: "睡前纸条：",
  },
  {
    key: "future",
    label: "给未来的我们",
    prefix: "给未来的我们：",
  },
  {
    key: "hug",
    label: "悄悄抱抱你",
    prefix: "悄悄抱抱你：",
  },
];
