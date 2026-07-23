import type { InstitutionDetail, ReservationDto } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "../components/utils/ErrorBoundary";
import { worker } from "../test/mocks/browser";
import {
  createMockInstitutionDetail,
  createMockReservationDto,
  createMockReservationsPage,
} from "../test/mocks/data";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import DetailPage from "./Detail";

const BASE = import.meta.env.VITE_API_ENDPOINT;

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile.value,
}));

const VALID_UUID = "b3ed861c-c057-4b71-8678-93b7fea06202";
const FAKE_NOW = new Date("2025-06-15T12:00:00+09:00");

beforeEach(() => {
  mockIsMobile.value = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const defaultDetail = createMockInstitutionDetail();

const useMswDetailMock = (
  detail: InstitutionDetail = defaultDetail,
  reservationItems: ReservationDto[] = [],
  options?: { reservationDelay?: number; detailError?: boolean; reservationError?: boolean }
) => {
  worker.use(
    http.get(`${BASE}/v1/institutions/:id/reservations`, async () => {
      if (options?.reservationError) {
        return new HttpResponse("GraphQL error", { status: 500 });
      }
      if (options?.reservationDelay) {
        await new Promise((resolve) => setTimeout(resolve, options.reservationDelay));
      }
      return HttpResponse.json(createMockReservationsPage(reservationItems));
    }),
    http.get(`${BASE}/v1/institutions/:id`, () => {
      if (options?.detailError) {
        return new HttpResponse("Network error", { status: 500 });
      }
      return HttpResponse.json(detail);
    })
  );
};

describe("Detail Page", () => {
  describe("無効なUUID", () => {
    it("無効なUUIDの場合、トップページにリダイレクトする", async () => {
      await renderWithProviders(<DetailPage />, {
        initialEntries: ["/institution/not-a-uuid"],
        route: "/institution/:id",
      });

      await expect.element(screen.getByText("施設情報")).not.toBeInTheDocument();
      await expect.element(screen.getByText("予約状況")).not.toBeInTheDocument();
    });
  });

  describe("有効なUUID", () => {
    it("施設名（建物名＋施設名）を表示する", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();
    });

    it("website_urlがある場合にリンクアイコンが表示される", async () => {
      useMswDetailMock(createMockInstitutionDetail({ website_url: "https://example.com" }));

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
      });

      await vi.waitFor(() => {
        const link = document.querySelector('a[href="https://example.com"]');
        expect(link).not.toBeNull();
      });
    });

    it("building/institutionが空の場合でも表示される", async () => {
      useMswDetailMock(createMockInstitutionDetail({ building: "", institution: "" }));

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
      });

      await expect.element(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("「施設情報」タブがデフォルトでアクティブである", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
      });

      const institutionTab = screen.getByRole("tab", { name: "施設情報" });
      await expect.element(institutionTab).toHaveAttribute("aria-selected", "true");
    });

    it("施設の詳細情報のInput項目を表示する", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
      });

      await expect.element(screen.getByText("定員（人）")).toBeInTheDocument();

      await expect.element(screen.getByText("面積（㎡）")).toBeInTheDocument();
      await expect.element(screen.getByText("利用料金（平日）")).toBeInTheDocument();
      await expect.element(screen.getByText("利用料金（休日）")).toBeInTheDocument();
      await expect.element(screen.getByText("弦楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("木管楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("金管楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("打楽器")).toBeInTheDocument();
      await expect.element(screen.getByText("譜面台")).toBeInTheDocument();
      await expect.element(screen.getByText("ピアノ")).toBeInTheDocument();
      await expect.element(screen.getByText("住所")).toBeInTheDocument();
      await expect.element(screen.getByText("抽選期間")).toBeInTheDocument();
      await expect.element(screen.getByText("備考")).toBeInTheDocument();
    });
  });

  describe("認証状態による「予約状況」タブの制御", () => {
    it("anonymousユーザーの場合、「予約状況」タブが無効になる", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: true, trial: false } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      await expect.element(reservationTab).toBeDisabled();
    });

    it("trialユーザーの場合、「予約状況」タブが無効になる", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: true } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      await expect.element(reservationTab).toBeDisabled();
    });

    it("認証済みユーザーの場合、「予約状況」タブが有効になる", async () => {
      useMswDetailMock();

      await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      await expect.element(reservationTab).toBeEnabled();
    });
  });

  describe("予約状況タブ", () => {
    it("予約状況タブをクリックすると予約テーブルが表示される", async () => {
      const dto1 = createMockReservationDto();
      const dto2 = createMockReservationDto({
        date: "2025-06-20",
        reservation: {
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_VACANT",
          RESERVATION_DIVISION_EVENING: "RESERVATION_STATUS_STATUS_2",
        },
        updated_at: "2025-06-19T12:00:00",
      });

      useMswDetailMock(defaultDetail, [dto1, dto2]);

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await expect.element(screen.getByText("日付")).toBeInTheDocument();
      await expect.element(screen.getByText("更新日時")).toBeInTheDocument();
    });

    it("予約クエリの startDate にレンダ時点の本日を渡す", async () => {
      let capturedStartDate: string | null = null;
      worker.use(
        http.get(`${BASE}/v1/institutions/:id`, () => HttpResponse.json(defaultDetail)),
        http.get(`${BASE}/v1/institutions/:id/reservations`, ({ request }) => {
          capturedStartDate = new URL(request.url).searchParams.get("startDate");
          return HttpResponse.json(createMockReservationsPage([]));
        })
      );

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await vi.waitFor(() => {
        expect(capturedStartDate).toBe("2025-06-15");
      });
    });

    it("予約データが空の場合、データなしメッセージを表示する", async () => {
      useMswDetailMock(defaultDetail, []);

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
    });

    it("予約状況除外対象の自治体の場合、データなしメッセージを表示する", async () => {
      useMswDetailMock(createMockInstitutionDetail({ municipality: "MUNICIPALITY_SUGINAMI" }), [
        createMockReservationDto(),
      ]);

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
    });

    it("予約データ取得中にスピナーを表示する", async () => {
      useMswDetailMock(defaultDetail, [], { reservationDelay: 60000 });

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await expect
        .element(screen.getByRole("progressbar", { name: "読み込み中" }))
        .toBeInTheDocument();
    });

    it("予約データ取得でエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      useMswDetailMock(defaultDetail, [], { reservationError: true });

      const { user } = await renderWithProviders(
        <ErrorBoundary>
          <DetailPage />
        </ErrorBoundary>,
        {
          initialEntries: [`/institution/${VALID_UUID}`],
          route: "/institution/:id",
          auth0Config: { userInfo: { anonymous: false, trial: false } },
        }
      );

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await expect
        .element(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        )
        .toBeInTheDocument();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("施設詳細取得でエラーが発生した場合、ErrorBoundaryがエラーをキャッチする", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      useMswDetailMock(defaultDetail, [], { detailError: true });

      await renderWithProviders(
        <ErrorBoundary>
          <DetailPage />
        </ErrorBoundary>,
        {
          initialEntries: [`/institution/${VALID_UUID}`],
          route: "/institution/:id",
          auth0Config: { userInfo: { anonymous: false, trial: false } },
        }
      );

      await expect
        .element(
          screen.getByText(
            "予期せぬエラーが発生しました。再読み込みしてください。何度も発生する場合は管理者にお問い合わせください。"
          )
        )
        .toBeInTheDocument();

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
      const dto1 = createMockReservationDto();
      const dto2 = createMockReservationDto({
        date: "2025-06-20",
        reservation: {
          RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_STATUS_1",
          RESERVATION_DIVISION_AFTERNOON: "RESERVATION_STATUS_VACANT",
        },
        updated_at: "2025-06-19T12:00:00",
      });

      useMswDetailMock(defaultDetail, [dto1, dto2]);

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      await expect
        .element(screen.getByRole("heading", { name: /テスト文化センター 音楽練習室A/ }))
        .toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "予約状況" }));

      await vi.waitFor(() => {
        const allText = document.body.textContent || "";
        expect(allText).toContain("2024");
        expect(allText).toContain("2025");
      });
    });
  });

  describe("タブ切り替え", () => {
    it("タブをクリックするとタブが切り替わる", async () => {
      useMswDetailMock(defaultDetail, []);

      const { user } = await renderWithProviders(<DetailPage />, {
        initialEntries: [`/institution/${VALID_UUID}`],
        route: "/institution/:id",
        auth0Config: { userInfo: { anonymous: false, trial: false } },
      });

      const institutionTab = screen.getByRole("tab", { name: "施設情報" });
      const reservationTab = screen.getByRole("tab", { name: "予約状況" });
      await expect.element(institutionTab).toHaveAttribute("aria-selected", "true");
      await expect.element(reservationTab).toHaveAttribute("aria-selected", "false");

      await user.click(reservationTab);

      await expect.element(reservationTab).toHaveAttribute("aria-selected", "true");
      await expect.element(institutionTab).toHaveAttribute("aria-selected", "false");
    });
  });
});
