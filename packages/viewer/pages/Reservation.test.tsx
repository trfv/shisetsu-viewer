import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen, waitFor } from "../test/utils/test-utils";
import { ReservationsDocument } from "../api/gql/graphql";
import {
  createMockSearchableReservationNode,
  createMockSearchableReservationsConnection,
} from "../test/mocks/data";

vi.mock("../hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

const FAKE_NOW = new Date("2025-06-15T12:00:00+09:00");

let ReservationPage: React.ComponentType;

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(FAKE_NOW);
  vi.resetModules();
  const mod = await import("./Reservation");
  ReservationPage = mod.default;
});

afterEach(() => {
  vi.useRealTimers();
});

// Build expected variables matching what the component will generate with the fake date.
const startDate = new Date("2025-06-15T12:00:00+09:00");
const endDate = new Date("2025-07-15T12:00:00+09:00");

const defaultVariables = {
  first: 100,
  after: null,
  municipality: ["MUNICIPALITY_KOUTOU"],
  isAvailableStrings: null,
  isAvailableWoodwind: null,
  isAvailableBrass: null,
  isAvailablePercussion: null,
  institutionSizes: null,
  startDate: startDate.toDateString(),
  endDate: endDate.toDateString(),
  isHoliday: null,
  isMorningVacant: null,
  isAfternoonVacant: null,
  isEveningVacant: null,
};

describe("Reservation Page", () => {
  describe("検索フォームの表示", () => {
    it("絞り込みボタンを押すとSelect、DateRangePicker、CheckboxGroupが表示される", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      // Open the drawer
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });
      expect(screen.getByText("期間指定")).toBeInTheDocument();
      expect(screen.getByText("絞り込み", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText("利用可能楽器")).toBeInTheDocument();
      expect(screen.getByText("施設サイズ")).toBeInTheDocument();
    });

    it("選択した地区と日付範囲がチップとして表示される", () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      expect(screen.getByText("江東区")).toBeInTheDocument();
      expect(screen.getByText(/2025\/06\/15.*〜.*2025\/07\/15/)).toBeInTheDocument();
    });

    it("予約状況除外対象の自治体がSelectの選択肢から除外されている", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      const { user } = renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      // Open the drawer to access Select
      await user.click(screen.getByText("絞り込み"));

      await waitFor(() => {
        expect(screen.getByText("地区")).toBeInTheDocument();
      });

      // Open the MUI Select dropdown
      const selectTrigger = screen.getByRole("combobox", { name: "地区" });
      await user.click(selectTrigger);

      // Wait for the listbox to appear
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
      });

      // Non-excluded municipalities should be present as options
      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveTextContent("江東区");
      expect(listbox).toHaveTextContent("北区");
      expect(listbox).toHaveTextContent("荒川区");

      // Excluded municipalities should NOT be present
      // RESERVATION_EXCLUDED_MUNICIPALITIES: edogawa, ota, suginami, toshima, bunkyo
      expect(listbox).not.toHaveTextContent("江戸川区");
      expect(listbox).not.toHaveTextContent("大田区");
      expect(listbox).not.toHaveTextContent("杉並区");
      expect(listbox).not.toHaveTextContent("豊島区");
      expect(listbox).not.toHaveTextContent("文京区");
    });
  });

  describe("データが空の場合", () => {
    it("データが存在しないメッセージを表示する", async () => {
      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("表示するデータが存在しません")).toBeInTheDocument();
      });
    });
  });

  describe("データが返却された場合", () => {
    it("DataTableに予約データを表示する", async () => {
      const node1 = createMockSearchableReservationNode({
        institution: {
          __typename: "institutions",
          id: btoa(
            JSON.stringify([1, "public", "institutions", "b3ed861c-c057-4b71-8678-93b7fea06202"])
          ),
          municipality: "MUNICIPALITY_KOUTOU",
          building: "テスト文化センター",
          institution: "音楽練習室A",
          institution_size: "INSTITUTION_SIZE_MEDIUM",
        },
      });
      const node2 = createMockSearchableReservationNode({
        id: "searchable-reservation-2",
        institution: {
          __typename: "institutions",
          id: btoa(
            JSON.stringify([1, "public", "institutions", "a1234567-b890-cdef-1234-567890abcdef"])
          ),
          municipality: "MUNICIPALITY_KOUTOU",
          building: "サンプル会館",
          institution: "リハーサル室B",
          institution_size: "INSTITUTION_SIZE_LARGE",
        },
        reservation: {
          __typename: "reservations",
          id: "reservation-2",
          date: "2025-07-01",
          reservation: {
            RESERVATION_DIVISION_MORNING: "RESERVATION_STATUS_VACANT",
          },
          updated_at: "2025-06-30T12:00:00",
        },
      });

      const mock = {
        request: {
          query: ReservationsDocument,
          variables: defaultVariables,
        },
        result: createMockSearchableReservationsConnection([node1, node2]),
      };

      renderWithProviders(<ReservationPage />, {
        initialEntries: ["/reservation?m=koutou"],
        mocks: [mock],
      });

      await waitFor(() => {
        expect(screen.getByText("施設名")).toBeInTheDocument();
      });

      expect(screen.getByText("テスト文化センター 音楽練習室A")).toBeInTheDocument();
      expect(screen.getByText("サンプル会館 リハーサル室B")).toBeInTheDocument();
    });
  });
});
