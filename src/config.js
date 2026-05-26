export const appConfig = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "",
  },
  defaultRoomCode: import.meta.env.VITE_CABIN_ROOM_CODE || "hanyue-2026",
  people: {
    me: import.meta.env.VITE_CABIN_ME_NAME || "小狗 🐾",
    ta: import.meta.env.VITE_CABIN_TA_NAME || "小月月 🌙",
  },
};

export const quickEncouragements = [
  "拍拍你",
  "今天已经很好了",
  "完成保底也很棒",
  "慢慢来，我也在",
  "先喝口水",
  "今天先这样也很好",
];

export const energyOptions = [
  {
    key: "okay",
    label: "还可以",
    tone: "warm",
  },
  {
    key: "tired",
    label: "有点累",
    tone: "leaf",
  },
  {
    key: "annoyed",
    label: "很烦",
    tone: "lavender",
  },
  {
    key: "rest",
    label: "只想休息",
    tone: "soft",
  },
];
