import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Select } from "./Select";

const selectOptions = [
  { value: "tokyo", label: "東京都" },
  { value: "kawasaki", label: "川崎市" },
  { value: "yokohama", label: "横浜市" },
];

describe("Select Component", () => {
  it("ラベルを表示する", async () => {
    await renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    await expect.element(screen.getByText("地域")).toBeInTheDocument();
  });

  it("選択された値を正しく表示する", async () => {
    await renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    const select = screen.getByRole("combobox", { name: "地域" });
    await expect.element(select).toHaveValue("tokyo");
  });

  it("すべてのオプションが存在する", async () => {
    await renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    const options = screen.getByRole("option").all();
    expect(options).toHaveLength(3);
  });

  it("オプション選択時にonChangeが呼ばれる", async () => {
    const handleChange = vi.fn();
    const { user } = await renderWithProviders(
      <Select label="地域" value="tokyo" onChange={handleChange} selectOptions={selectOptions} />
    );

    const select = screen.getByRole("combobox", { name: "地域" });
    await user.selectOptions(select, "kawasaki");

    expect(handleChange).toHaveBeenCalled();
  });

  it("適切なaria-label属性を持つ", async () => {
    await renderWithProviders(
      <Select label="地域" value="tokyo" onChange={vi.fn()} selectOptions={selectOptions} />
    );

    const select = screen.getByRole("combobox", { name: "地域" });
    await expect.element(select).toBeInTheDocument();
  });
});
