import type { BuildingDetail, ReservationSearchHit } from "@shisetsu-viewer/shared";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route, useLocation } from "wouter";

import { worker } from "../test/mocks/browser";
import {
  createMockBuildingDetail,
  createMockInstitutionSummary,
  createMockReservationSearchHit,
  createMockReservationSearchPage,
  MOCK_BUILDING_ID,
} from "../test/mocks/data";
import { renderWithProviders, screen } from "../test/utils/test-utils";
import BuildingPage from "./Building";

const BASE = "/api";
const ROOM_ID = "b3ed861c-c057-4b71-8678-93b7fea06202";

const mockIsMobile = vi.hoisted(() => ({ value: false }));
vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile.value,
}));

beforeEach(() => {
  mockIsMobile.value = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2025-06-15T12:00:00+09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

const LocationProbe = () => {
  const [location] = useLocation();
  return <output aria-label="現在地">{location}</output>;
};

const useMswBuildingMock = (
  building: BuildingDetail = createMockBuildingDetail(),
  hits: ReservationSearchHit[] = [],
  onSearch?: (params: URLSearchParams) => void
) => {
  worker.use(
    http.get(`${BASE}/v1/buildings/:id`, () => HttpResponse.json(building)),
    http.get(`${BASE}/v1/reservations/search`, ({ request }) => {
      onSearch?.(new URL(request.url).searchParams);
      return HttpResponse.json(createMockReservationSearchPage(hits));
    })
  );
};

const renderBuilding = (authConfig?: { userInfo: { anonymous: boolean; trial: boolean } }) =>
  renderWithProviders(
    <>
      <Route path="/building/:id">
        <BuildingPage />
      </Route>
      <LocationProbe />
    </>,
    {
      initialEntries: [`/building/${MOCK_BUILDING_ID}`],
      ...(authConfig ? { authConfig } : {}),
    }
  );

describe("Building Page", () => {
  it("無効なUUIDの場合、トップページにリダイレクトする", async () => {
    await renderWithProviders(<BuildingPage />, {
      initialEntries: ["/building/not-a-uuid"],
      route: "/building/:id",
    });

    await expect.element(screen.getByText("施設情報")).not.toBeInTheDocument();
  });

  it("見出しに地区と建物名を出し、予約システムへのリンクを付ける", async () => {
    useMswBuildingMock();

    await renderBuilding();

    await expect
      .element(screen.getByRole("heading", { name: /江東区 テスト文化センター/ }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("link", { name: "江東区文化コミュニティ財団 施設予約システム" }))
      .toHaveAttribute("href", "https://www.kcf.or.jp/yoyaku/shisetsu/");
  });

  it("予約システムを持たない建物では予約システムへのリンクを出さない", async () => {
    useMswBuildingMock(createMockBuildingDetail({ reservation_system: null }));

    await renderBuilding();

    await expect
      .element(screen.getByRole("heading", { name: /江東区 テスト文化センター/ }))
      .toBeInTheDocument();
    await expect.element(screen.getByRole("heading").getByRole("link")).not.toBeInTheDocument();
  });

  it("住所と予約システム名と建物内の部屋を表示する", async () => {
    useMswBuildingMock(
      createMockBuildingDetail({
        institutions: [
          createMockInstitutionSummary(),
          createMockInstitutionSummary({
            id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            institution: "音楽練習室B",
          }),
        ],
      })
    );

    await renderBuilding();

    await expect.element(screen.getByLabelText("住所")).toHaveValue("東京都江東区東陽1-1-1");
    await expect
      .element(screen.getByLabelText("予約システム"))
      .toHaveValue("江東区文化コミュニティ財団 施設予約システム");
    await expect.element(screen.getByText("音楽練習室A")).toBeInTheDocument();
    await expect.element(screen.getByText("音楽練習室B")).toBeInTheDocument();
  });

  it("部屋の行を押すと部屋の詳細ページへ移る", async () => {
    useMswBuildingMock();

    const { user } = await renderBuilding();

    await user.click(screen.getByText("音楽練習室A"));

    await expect
      .element(screen.getByLabelText("現在地"))
      .toHaveTextContent(`/institution/${ROOM_ID}`);
  });

  it("anonymousユーザーの場合、「予約状況」タブが無効になる", async () => {
    useMswBuildingMock();

    await renderBuilding({ userInfo: { anonymous: true, trial: false } });

    await expect.element(screen.getByRole("tab", { name: "予約状況" })).toBeDisabled();
  });

  it("trialユーザーの場合、「予約状況」タブが無効になる", async () => {
    useMswBuildingMock();

    await renderBuilding({ userInfo: { anonymous: false, trial: true } });

    await expect.element(screen.getByRole("tab", { name: "予約状況" })).toBeDisabled();
  });

  it("予約状況タブでは建物と本日からの期間で予約を検索する", async () => {
    let captured: URLSearchParams | undefined;
    useMswBuildingMock(createMockBuildingDetail(), [], (params) => {
      captured = params;
    });

    const { user } = await renderBuilding();

    await user.click(screen.getByRole("tab", { name: "予約状況" }));

    await vi.waitFor(() => {
      expect(captured?.get("buildingId")).toBe(MOCK_BUILDING_ID);
      expect(captured?.get("startDate")).toBe("2025-06-15");
      expect(captured?.get("endDate")).toBe("2025-12-31");
      expect(captured?.has("municipality")).toBe(false);
    });
  });

  it("予約状況タブに部屋ごとの空きを日付順に表示し、行を押すと部屋の詳細へ移る", async () => {
    useMswBuildingMock(createMockBuildingDetail(), [
      createMockReservationSearchHit(),
      createMockReservationSearchHit({
        institution: {
          id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          building_id: MOCK_BUILDING_ID,
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室B",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      }),
    ]);

    const { user } = await renderBuilding();

    await user.click(screen.getByRole("tab", { name: "予約状況" }));

    const rows = screen.getByRole("row");
    await expect.element(rows.nth(1)).toMatchTextContent(/2024\/10\/01.*音楽練習室A/);
    await expect.element(rows.nth(2)).toMatchTextContent(/2024\/10\/01.*音楽練習室B/);

    await user.click(screen.getByText("音楽練習室B"));

    await expect
      .element(screen.getByLabelText("現在地"))
      .toHaveTextContent("/institution/a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  it("予約状況を扱わない自治体の建物では、データなしメッセージを表示する", async () => {
    useMswBuildingMock(createMockBuildingDetail({ municipality: "MUNICIPALITY_SUGINAMI" }), [
      createMockReservationSearchHit(),
    ]);

    const { user } = await renderBuilding();

    await user.click(screen.getByRole("tab", { name: "予約状況" }));

    await expect.element(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
  });
});
