import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { renderWithProviders, screen, waitFor } from "../../test/utils/test-utils";
import { Select } from "./Select";

const selectOptions = [
  { value: "tokyo", label: "東京都" },
  { value: "kawasaki", label: "川崎市" },
  { value: "yokohama", label: "横浜市" },
];

describe("Select Component", () => {
  it("ラベルを表示する", () => {
    renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    expect(screen.getByText("地域")).toBeInTheDocument();
  });

  it("選択された値を正しく表示する", () => {
    renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    // MUI Select displays the label of the selected option
    expect(screen.getByText("東京都")).toBeInTheDocument();
  });

  it("ドロップダウンを開くとオプションを表示する", async () => {
    const { user } = renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    // Click the select to open the dropdown
    const selectButton = screen.getByRole("combobox", { name: "地域" });
    await user.click(selectButton);

    // All options should be visible in the dropdown
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(3);
    });
  });

  it("オプション選択時にonChangeが呼ばれる", async () => {
    const handleChange = vi.fn();
    const { user } = renderWithProviders(
      <Select label="地域" value="tokyo" onChange={handleChange} selectOptions={selectOptions} />
    );

    // Open the dropdown
    const selectButton = screen.getByRole("combobox", { name: "地域" });
    await user.click(selectButton);

    // Click an option
    await waitFor(async () => {
      const option = screen.getByRole("option", { name: "川崎市" });
      await user.click(option);
    });

    expect(handleChange).toHaveBeenCalled();
  });

  it("適切なaria-label属性を持つ", () => {
    renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    const select = screen.getByRole("combobox", { name: "地域" });
    expect(select).toBeInTheDocument();
  });
});
