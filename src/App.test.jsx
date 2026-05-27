import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildEntrySession, EntryGate, tabs } from "./App.jsx";
import { appConfig } from "./config";

describe("EntryGate", () => {
  it("renders a PIN password field before entering the cabin", () => {
    const html = renderToStaticMarkup(<EntryGate onEnter={() => {}} />);

    expect(html).toContain('id="pin"');
    expect(html).toContain('type="password"');
  });

  it("keeps the trimmed PIN in the session used for write requests", () => {
    expect(buildEntrySession({ roomCode: "  ", owner: "me", pin: " 1314 " })).toEqual({
      roomCode: appConfig.defaultRoomCode,
      owner: "me",
      pin: "1314",
    });
  });
});

describe("room navigation", () => {
  it("keeps the app focused on four gentle room areas", () => {
    expect(tabs.map((tab) => tab.label)).toEqual(["小屋", "今日", "信箱", "回忆"]);
  });
});
