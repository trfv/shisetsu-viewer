import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../../test/utils/test-utils";
import { Tab } from "../Tab";
import { TabGroup, TabPanel } from "./TabGroup";

describe("TabGroup Component", () => {
  it("タブを表示する", () => {
    renderWithProviders(
      <TabGroup value="tab1">
        <Tab label="タブ1" value="tab1" />
        <Tab label="タブ2" value="tab2" />
        <Tab label="タブ3" value="tab3" />
      </TabGroup>
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByText("タブ1")).toBeInTheDocument();
    expect(screen.getByText("タブ2")).toBeInTheDocument();
    expect(screen.getByText("タブ3")).toBeInTheDocument();
  });

  it("正しい数のタブを表示する", () => {
    renderWithProviders(
      <TabGroup value="tab1">
        <Tab label="タブA" value="tab1" />
        <Tab label="タブB" value="tab2" />
      </TabGroup>
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });

  it("選択されたタブにaria-selected属性を持つ", () => {
    renderWithProviders(
      <TabGroup value="tab2">
        <Tab label="タブ1" value="tab1" />
        <Tab label="タブ2" value="tab2" />
      </TabGroup>
    );

    const tab1 = screen.getByText("タブ1").closest('[role="tab"]');
    const tab2 = screen.getByText("タブ2").closest('[role="tab"]');
    expect(tab1).toHaveAttribute("aria-selected", "false");
    expect(tab2).toHaveAttribute("aria-selected", "true");
  });
});

describe("TabPanel Component", () => {
  it("currentValueがtabValueと一致する場合にコンテンツを表示する", () => {
    renderWithProviders(
      <TabPanel tabValue="tab1" currentValue="tab1">
        <div>パネルの内容</div>
      </TabPanel>
    );

    expect(screen.getByText("パネルの内容")).toBeInTheDocument();
  });

  it("currentValueがtabValueと一致しない場合にnullを返す", () => {
    renderWithProviders(
      <TabPanel tabValue="tab1" currentValue="tab2">
        <div>非表示の内容</div>
      </TabPanel>
    );

    expect(screen.queryByText("非表示の内容")).not.toBeInTheDocument();
  });

  it("異なるtabValueで別々のパネルを切り替える", () => {
    renderWithProviders(
      <>
        <TabPanel tabValue="tab1" currentValue="tab1">
          <div>パネル1の内容</div>
        </TabPanel>
        <TabPanel tabValue="tab2" currentValue="tab1">
          <div>パネル2の内容</div>
        </TabPanel>
      </>
    );

    expect(screen.getByText("パネル1の内容")).toBeInTheDocument();
    expect(screen.queryByText("パネル2の内容")).not.toBeInTheDocument();
  });
});
