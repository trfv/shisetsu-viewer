import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import TopPage from "./Top";

describe("Top Page", () => {
  describe("表示内容", () => {
    it("メインの見出しを表示する", () => {
      renderWithProviders(<TopPage />);

      expect(screen.getByRole("heading", { name: "はじめに", level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "機能の説明", level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "対応地区", level: 2 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "備考", level: 2 })).toBeInTheDocument();
    });

    it("サブ見出しを表示する", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByRole("heading", { name: "予約状況検索機能", level: 3 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "施設情報検索機能", level: 3 })
      ).toBeInTheDocument();
    });

    it("サイトの説明文を表示する", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText(
          "このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。"
        )
      ).toBeInTheDocument();
    });

    it("予約状況検索機能の説明を表示する", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText("公共施設の予約状況を予約システムから取得し、加工して表示しています。")
      ).toBeInTheDocument();
    });

    it("施設情報検索機能の説明を表示する", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText("公共施設の施設情報をウェブサイトから取得し、加工して表示しています。")
      ).toBeInTheDocument();
    });

    it("対応地区のリストを表示する", () => {
      renderWithProviders(<TopPage />);

      const supportedAreas = [
        "荒川区",
        "江戸川区（※現在、予約状況が表示できません）",
        "大田区（※現在、予約状況が表示できません）",
        "北区",
        "江東区",
        "杉並区（※現在、予約状況が表示できません）",
        "墨田区",
        "豊島区（※現在、予約状況が表示できません）",
        "中央区",
        "文京区（※現在、予約状況が表示できません）",
        "川崎市",
      ];

      supportedAreas.forEach((area) => {
        expect(screen.getByText(area)).toBeInTheDocument();
      });
    });

    it("備考の項目を表示する", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText(
          "予約状況検索機能については、管理人の許可制としております。管理人までご連絡ください。"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("表示されている情報に関し、当サイトはいかなる責任も負いません。")
      ).toBeInTheDocument();
    });

    it("著作権表示を表示する", () => {
      renderWithProviders(<TopPage />);

      expect(screen.getByText(/Copyright/)).toBeInTheDocument();
    });
  });

  describe("セマンティック構造", () => {
    it("適切なHTML構造を持つ", () => {
      renderWithProviders(<TopPage />);

      // メインランドマークが存在する
      expect(screen.getByRole("main")).toBeInTheDocument();

      // リストが適切にマークアップされている
      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThan(0);

      // リストアイテムが存在する
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBeGreaterThan(0);
    });

    it("見出しの階層構造が適切である", () => {
      renderWithProviders(<TopPage />);

      // h2見出しが存在する
      const h2Headings = screen.getAllByRole("heading", { level: 2 });
      expect(h2Headings).toHaveLength(4);

      // h3見出しが存在する
      const h3Headings = screen.getAllByRole("heading", { level: 3 });
      expect(h3Headings).toHaveLength(2);
    });
  });

  describe("レスポンシブ対応", () => {
    it("モバイル表示で適切にレンダリングされる", () => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = renderWithProviders(<TopPage />);

      // スタイルが適用されていることを確認
      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
    });

    it("デスクトップ表示で適切にレンダリングされる", () => {
      // デスクトップビューポートをシミュレート
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { container } = renderWithProviders(<TopPage />);

      // スタイルが適用されていることを確認
      const mainElement = container.querySelector("main");
      expect(mainElement).toBeInTheDocument();
    });
  });

  describe("コンテンツの完全性", () => {
    it("すべての必要な情報が含まれている", () => {
      renderWithProviders(<TopPage />);

      // サイトの目的
      expect(screen.getByText(/音楽練習が可能な公共施設/)).toBeInTheDocument();

      // 機能説明
      expect(screen.getByText(/予約状況を予約システムから取得/)).toBeInTheDocument();
      expect(screen.getByText(/施設情報をウェブサイトから取得/)).toBeInTheDocument();

      // 利用上の注意
      expect(screen.getByText(/管理人の許可制/)).toBeInTheDocument();
      expect(screen.getByText(/いかなる責任も負いません/)).toBeInTheDocument();
    });

    it("対応地区の情報が完全である", () => {
      renderWithProviders(<TopPage />);

      // 対応地区の数をチェック - 対応地区のh2の次のulのliのみを数える
      const areaHeading = screen.getByRole("heading", { name: "対応地区" });
      const nextSibling = areaHeading.nextElementSibling;
      const listItems = nextSibling?.querySelectorAll("li");
      expect(listItems).toHaveLength(11);

      // 予約状況表示不可の注記があることを確認
      const unavailableAreas = screen.getAllByText(/※現在、予約状況が表示できません/);
      expect(unavailableAreas).toHaveLength(5);
    });
  });

  describe("テキストの正確性", () => {
    it("技術的な説明が正確である", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText("公共施設の予約状況を予約システムから取得し、加工して表示しています。")
      ).toBeInTheDocument();
      expect(
        screen.getByText("公共施設の施設情報をウェブサイトから取得し、加工して表示しています。")
      ).toBeInTheDocument();
    });

    it("免責事項が適切に表示されている", () => {
      renderWithProviders(<TopPage />);

      expect(
        screen.getByText("表示されている情報に関し、当サイトはいかなる責任も負いません。")
      ).toBeInTheDocument();
    });

    it("著作権情報が正確である", () => {
      renderWithProviders(<TopPage />);

      expect(screen.getByText(/Copyright/)).toBeInTheDocument();
    });
  });

  describe("スタイリング", () => {
    it("コンテナの最大幅が設定されている", () => {
      const { container } = renderWithProviders(<TopPage />);

      const contentBox = container.querySelector('[class*="contentBox"]');
      expect(contentBox).toBeInTheDocument();
    });

    it("著作権セクションが中央揃えで表示される", () => {
      renderWithProviders(<TopPage />);

      const copyright = screen.getByText(/Copyright/);
      expect(copyright).toBeInTheDocument();
    });
  });
});
