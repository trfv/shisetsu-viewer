import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { InstitutionDetailDocument, InstitutionReservationsDocument } from "../api/gql/graphql";
import {
  createMockInstitutionDetailNode,
  createMockInstitutionDetailConnection,
  createMockReservationNode,
  createMockInstitutionReservationsConnection,
} from "../test/mocks/data";
import { ErrorBoundary } from "../components/utils/ErrorBoundary";

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile.value,
}));

const VALID_UUID = "b3ed861c-c057-4b71-8678-93b7fea06202";
const FAKE_NOW = new Date("2025-06-15T12:00:00+09:00");

let DetailPage: React.ComponentType;

beforeEach(async () => {
  mockIsMobile.value = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FAKE_NOW);
  vi.resetModules();
  const mod = await import("./Detail");
  DetailPage = mod.default;
});

afterEach(() => {
  vi.useRealTimers();
});

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

    it("website_urlがある場合にリンクアイコンが表示される", async () => {
      const nodeWithUrl = createMockInstitutionDetailNode({
        website_url: "https://example.com",
      });
      const responseWithUrl = createMockInstitutionDetailConnection(nodeWithUrl);
      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: responseWithUrl,
        },
      ];

      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
      });

      await waitFor(() => {
        const link = document.querySelector('a[href="https://example.com"]');
        expect(link).toBeInTheDocument();
      });
    });

    it("building/institutionがnullの場合でも表示される", async () => {
      const nodeWithNull = createMockInstitutionDetailNode({
        building: null,
        institution: null,
      });
      const responseWithNull = createMockInstitutionDetailConnection(nodeWithNull);
      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: responseWithNull,
        },
      ];

      renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
      });

      await waitFor(() => {
        // building and institution are null, heading should render with empty strings
        const heading = screen.getByRole("heading", { level: 2 });
        expect(heading).toBeInTheDocument();
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

  describe("予約状況タブ", () => {
    it("予約状況タブをクリックすると予約テーブルが表示される", async () => {
      const reservationNode1 = createMockReservationNode();
      const reservationNode2 = createMockReservationNode({
        id: "reservation-2",
        date: "2025-06-20",
        reservation: {
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_VACANT",
          RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_2",
        },
        updated_at: "2025-06-19T12:00:00",
      });

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          result: createMockInstitutionReservationsConnection([reservationNode1, reservationNode2]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      // Wait for institution data to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      // Click the reservation tab
      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      // Verify reservation table headers appear (desktop mode with useIsMobile mocked to false)
      await waitFor(() => {
        expect(screen.getByText("日付")).toBeInTheDocument();
      });
      expect(screen.getByText("取得日時")).toBeInTheDocument();
    });

    it("予約データが空の場合、データなしメッセージを表示する", async () => {
      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          result: createMockInstitutionReservationsConnection([]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await waitFor(() => {
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });

    it("予約状況除外対象の自治体の場合、データなしメッセージを表示する", async () => {
      const excludedNode = createMockInstitutionDetailNode({
        municipality: "MUNICIPALITY_BUNKYO",
      });
      const excludedResponse = createMockInstitutionDetailConnection(excludedNode);

      const reservationNode = createMockReservationNode();

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: excludedResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          result: createMockInstitutionReservationsConnection([reservationNode]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await waitFor(() => {
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });

    it("予約データ取得中にスピナーを表示する", async () => {
      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          delay: Infinity,
          result: createMockInstitutionReservationsConnection([]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await waitFor(() => {
        expect(screen.getByRole("progressbar", { name: "読み込み中" })).toBeInTheDocument();
      });
    });

    it("予約データ取得でエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          error: new Error("GraphQL error"),
        },
      ];

      const { user } = renderWithProviders(
        <ErrorBoundary>
          <DetailPage />
        </ErrorBoundary>,
        {
          initialEntries: [`/institution/${VALID_UUID}`],
          route: "/institution/:id",
          mocks,
          auth0Config: { userInfo: { anonymous: false, trial: false } },
        }
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      // ErrorBoundary catches the thrown error and renders the error snackbar
      await waitFor(() => {
        expect(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("施設詳細取得でエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          error: new Error("Network error"),
        },
      ];

      renderWithProviders(
        <ErrorBoundary>
          <DetailPage />
        </ErrorBoundary>,
        {
          initialEntries: [`/institution/${VALID_UUID}`],
          route: "/institution/:id",
          mocks,
          auth0Config: { userInfo: { anonymous: false, trial: false } },
        }
      );

      // ErrorBoundary catches the thrown error and renders the error snackbar
      await waitFor(() => {
        expect(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe("municipalityがundefinedの場合", () => {
    it("ReservationTabでエラーがスローされる", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const nodeWithoutMunicipality = createMockInstitutionDetailNode({
        municipality: undefined,
      });
      const responseWithoutMunicipality =
        createMockInstitutionDetailConnection(nodeWithoutMunicipality);

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: responseWithoutMunicipality,
        },
      ];

      const { user } = renderWithProviders(
        <ErrorBoundary>
          <DetailPage />
        </ErrorBoundary>,
        {
          initialEntries: [`/institution/${VALID_UUID}`],
          route: "/institution/:id",
          mocks,
          auth0Config: { userInfo: { anonymous: false, trial: false } },
        }
      );

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: "予約状況" })).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        ).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe("モバイル予約カードビュー", () => {
    beforeEach(() => {
      mockIsMobile.value = true;
    });

    afterEach(() => {
      mockIsMobile.value = false;
    });

    it("モバイルで予約データがカード形式で表示される", async () => {
      const reservationNode1 = createMockReservationNode();
      const reservationNode2 = createMockReservationNode({
        id: "reservation-2",
        date: "2025-06-20",
        reservation: {
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_VACANT",
        },
        updated_at: "2025-06-19T12:00:00",
      });

      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          result: createMockInstitutionReservationsConnection([reservationNode1, reservationNode2]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      // In mobile mode, should NOT render table elements for reservations
      // Instead, should render card-style divs
      await waitFor(() => {
        // Card dates should be visible (formatted month/date)
        const allText = document.body.textContent || "";
        expect(allText).toContain("2024");
        expect(allText).toContain("2025");
      });
    });
  });

  describe("タブ切り替え", () => {
    it("タブをクリックするとタブが切り替わる", async () => {
      const mocks = [
        {
          request: {
            query: InstitutionDetailDocument,
            variables: { id: VALID_UUID },
          },
          result: defaultDetailResponse,
        },
        {
          request: {
            query: InstitutionReservationsDocument,
            variables: { id: VALID_UUID, startDate: "2025-06-15" },
          },
          result: createMockInstitutionReservationsConnection([]),
        },
      ];

      const { user } = renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        mocks,
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      // Initially institution tab is selected
      const institutionTab = screen.getByRole("tab", { name: "施設情報" });
      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      expect(institutionTab).toHaveAttribute("aria-selected", "true");
      expect(reservationTab).toHaveAttribute("aria-selected", "false");

      // Click reservation tab
      await user.click(reservationTab);

      expect(reservationTab).toHaveAttribute("aria-selected", "true");
      expect(institutionTab).toHaveAttribute("aria-selected", "false");
    });
  });
});
