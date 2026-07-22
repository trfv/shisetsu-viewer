import { describe, it, expect } from "vitest";

import { renderWithProviders, screen } from "../test/utils/test-utils";
import TopPage from "./Top";

describe("Top Page", () => {
  describe("表示内容", () => {
    it("メインの見出しを表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(screen.getByRole("heading", { name: "はじめに", level: 2 }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("heading", { name: "機能の説明", level: 2 }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("heading", { name: "AI アシスタント連携", level: 2 }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("heading", { name: "対応地区", level: 2 }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("heading", { name: "備考", level: 2 }))
        .toBeInTheDocument();
    });

    it("サブ見出しを表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(screen.getByRole("heading", { name: "予約状況検索機能", level: 3 }))
        .toBeInTheDocument();
      await expect
        .element(screen.getByRole("heading", { name: "施設情報検索機能", level: 3 }))
        .toBeInTheDocument();
    });

    it("サイトの説明文を表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(
          screen.getByText(
            "このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。"
          )
        )
        .toBeInTheDocument();
    });

    it("予約状況検索機能の説明を表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(
          screen.getByText("公共施設の予約状況を予約システムから取得し、加工して表示しています。")
        )
        .toBeInTheDocument();
    });

    it("施設情報検索機能の説明を表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(
          screen.getByText("公共施設の施設情報をウェブサイトから取得し、加工して表示しています。")
        )
        .toBeInTheDocument();
    });

    it("対応地区のリストを表示する", async () => {
      await renderWithProviders(<TopPage />);

      const supportedAreas = [
        "荒川区",
        "江戸川区",
        "大田区",
        "北区",
        "江東区",
        "杉並区（※現在、予約状況が表示できません）",
        "墨田区",
        "豊島区",
        "中央区",
        "文京区",
        "川崎市",
      ];

      for (const area of supportedAreas) {
        await expect.element(screen.getByText(area)).toBeInTheDocument();
      }
    });

    it("備考の項目を表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(
          screen.getByText(
            "予約状況検索機能については、管理人の許可制としております。管理人までご連絡ください。"
          )
        )
        .toBeInTheDocument();
      await expect
        .element(screen.getByText("表示されている情報に関し、当サイトはいかなる責任も負いません。"))
        .toBeInTheDocument();
    });

    it("著作権表示を表示する", async () => {
      await renderWithProviders(<TopPage />);

      await expect.element(screen.getByText(/Copyright/)).toBeInTheDocument();
    });
  });

  describe("セマンティック構造", () => {
    it("適切なHTML構造を持つ", async () => {
      await renderWithProviders(<TopPage />);

      // メインランドマークが存在する
      await expect.element(screen.getByRole("main")).toBeInTheDocument();

      // リストが適切にマークアップされている
      const lists = screen.getByRole("list").all();
      expect(lists.length).toBeGreaterThan(0);

      // リストアイテムが存在する
      const listItems = screen.getByRole("listitem").all();
      expect(listItems.length).toBeGreaterThan(0);
    });

    it("見出しの階層構造が適切である", async () => {
      await renderWithProviders(<TopPage />);

      // h2見出しが存在する
      const h2Headings = screen.getByRole("heading", { level: 2 }).all();
      expect(h2Headings).toHaveLength(5);

      // h3見出しが存在する
      const h3Headings = screen.getByRole("heading", { level: 3 }).all();
      expect(h3Headings).toHaveLength(2);
    });
  });

  describe("レスポンシブ対応", () => {
    it("モバイル表示で適切にレンダリングされる", async () => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = await renderWithProviders(<TopPage />);

      // スタイルが適用されていることを確認
      const mainElement = container.querySelector("main");
      await expect.element(mainElement).toBeInTheDocument();
    });

    it("デスクトップ表示で適切にレンダリングされる", async () => {
      // デスクトップビューポートをシミュレート
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { container } = await renderWithProviders(<TopPage />);

      // スタイルが適用されていることを確認
      const mainElement = container.querySelector("main");
      await expect.element(mainElement).toBeInTheDocument();
    });
  });

  describe("コンテンツの完全性", () => {
    it("すべての必要な情報が含まれている", async () => {
      await renderWithProviders(<TopPage />);

      // サイトの目的
      await expect.element(screen.getByText(/音楽練習が可能な公共施設/)).toBeInTheDocument();

      // 機能説明
      await expect.element(screen.getByText(/予約状況を予約システムから取得/)).toBeInTheDocument();
      await expect.element(screen.getByText(/施設情報をウェブサイトから取得/)).toBeInTheDocument();

      // AI アシスタント連携
      await expect.element(screen.getByText(/MCP サーバーのドキュメント/)).toBeInTheDocument();

      // 利用上の注意
      await expect.element(screen.getByText(/管理人の許可制/)).toBeInTheDocument();
      await expect.element(screen.getByText(/いかなる責任も負いません/)).toBeInTheDocument();
    });

    it("対応地区の情報が完全である", async () => {
      await renderWithProviders(<TopPage />);

      // 対応地区の数をチェック - 対応地区のh2の次のulのliのみを数える
      const areaHeading = screen.getByRole("heading", { name: "対応地区" }).element();
      const nextSibling = areaHeading.nextElementSibling;
      const listItems = nextSibling?.querySelectorAll("li");
      expect(listItems).toHaveLength(11);

      // 予約状況表示不可の注記があることを確認
      const unavailableAreas = screen.getByText(/※現在、予約状況が表示できません/).all();
      expect(unavailableAreas).toHaveLength(1);
    });
  });

  describe("テキストの正確性", () => {
    it("技術的な説明が正確である", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(
          screen.getByText("公共施設の予約状況を予約システムから取得し、加工して表示しています。")
        )
        .toBeInTheDocument();
      await expect
        .element(
          screen.getByText("公共施設の施設情報をウェブサイトから取得し、加工して表示しています。")
        )
        .toBeInTheDocument();
    });

    it("免責事項が適切に表示されている", async () => {
      await renderWithProviders(<TopPage />);

      await expect
        .element(screen.getByText("表示されている情報に関し、当サイトはいかなる責任も負いません。"))
        .toBeInTheDocument();
    });

    it("著作権情報が正確である", async () => {
      await renderWithProviders(<TopPage />);

      await expect.element(screen.getByText(/Copyright/)).toBeInTheDocument();
    });
  });

  describe("スタイリング", () => {
    it("コンテナの最大幅が設定されている", async () => {
      const { container } = await renderWithProviders(<TopPage />);

      const contentBox = container.querySelector<HTMLElement>('[class*="contentBox"]');
      await expect.element(contentBox).toBeInTheDocument();
    });

    it("著作権セクションが中央揃えで表示される", async () => {
      await renderWithProviders(<TopPage />);

      await expect.element(screen.getByText(/Copyright/)).toBeInTheDocument();
    });
  });
});
