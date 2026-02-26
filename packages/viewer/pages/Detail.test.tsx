import { describe, it, expect } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { InstitutionDetailDocument } from "../api/gql/graphql";
import {
  createMockInstitutionDetailNode,
  createMockInstitutionDetailConnection,
} from "../test/mocks/data";
import DetailPage from "./Detail";

const VALID_UUID = "b3ed861c-c057-4b71-8678-93b7fea06202";

const defaultDetailNode = createMockInstitutionDetailNode();
const defaultDetailResponse = createMockInstitutionDetailConnection(defaultDetailNode);

const defaultMocks = [
  {
    request: {
      query: InstitutionDetailDocument,
      variables: { id: VALID_UUID },
    },
    result: defaultDetailResponse,
  },
];

describe("Detail Page", () => {
  describe("無効なUUID", () => {
    it("無効なUUIDの場合、トップページにリダイレクトする", () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: ["/institution/not-a-uuid"],
        route: "/institution/:id",
      });

      // Invalid UUID triggers Navigate to "/" so the detail content should not render
      expect(screen.queryByText("施設情報")).not.toBeInTheDocument();
      expect(screen.queryByText("予約状況")).not.toBeInTheDocument();
    });
  });

  describe("有効なUUID", () => {
    it("施設名（建物名＋施設名）を表示する", async () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });
    });

    it("「施設情報」タブがデフォルトでアクティブである", async () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
      });

      const institutionTab = screen.getByRole("tab", { name: "施設情報" });
      expect(institutionTab).toHaveAttribute("aria-selected", "true");
    });

    it("施設の詳細情報のInput項目を表示する", async () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
      });

      await waitFor(() => {
        expect(screen.getByText("定員（人）")).toBeInTheDocument();
      });

      expect(screen.getByText("面積（㎡）")).toBeInTheDocument();
      expect(screen.getByText("利用料金（平日）")).toBeInTheDocument();
      expect(screen.getByText("利用料金（休日）")).toBeInTheDocument();
      expect(screen.getByText("弦楽器")).toBeInTheDocument();
      expect(screen.getByText("木管楽器")).toBeInTheDocument();
      expect(screen.getByText("金管楽器")).toBeInTheDocument();
      expect(screen.getByText("打楽器")).toBeInTheDocument();
      expect(screen.getByText("譜面台")).toBeInTheDocument();
      expect(screen.getByText("ピアノ")).toBeInTheDocument();
      expect(screen.getByText("住所")).toBeInTheDocument();
      expect(screen.getByText("抽選期間")).toBeInTheDocument();
      expect(screen.getByText("備考")).toBeInTheDocument();
    });
  });

  describe("認証状態による「予約状況」タブの制御", () => {
    it("anonymousユーザーの場合、「予約状況」タブが無効になる", () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
        auth0Config: { userInfo: { anonymous: true, trial: false } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      expect(reservationTab).toBeDisabled();
    });

    it("trialユーザーの場合、「予約状況」タブが無効になる", () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
        auth0Config: { userInfo: { anonymous: false, trial: true } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      expect(reservationTab).toBeDisabled();
    });

    it("認証済みユーザーの場合、「予約状況」タブが有効になる", () => {
      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks: defaultMocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      expect(reservationTab).toBeEnabled();
    });
  });
});
