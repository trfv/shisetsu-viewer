import Markdown from "markdown-to-jsx";
import { FC } from "react";
import { CONTAINER_WIDTH, INNER_WIDTH, MAIN_HEIGHT } from "../constants/styles";
import { styled } from "../utils/theme";

export const Top: FC = () => {
  return (
    <StyledTop className={classes.pageBox}>
      <div className={classes.contentBox}>
        <Markdown>{CONTENT}</Markdown>
      </div>
    </StyledTop>
  );
};

const PREFIX = "Top";
const classes = {
  pageBox: `${PREFIX}-pageBox`,
  contentBox: `${PREFIX}-contentBox`,
};

const StyledTop = styled("main")(() => ({
  [`&.${classes.pageBox}`]: {
    width: "100%",
    minWidth: CONTAINER_WIDTH,
    height: MAIN_HEIGHT,
  },
  [`.${classes.contentBox}`]: {
    marginInline: "auto",
    padding: 24,
    width: INNER_WIDTH,
  },
}));

// README.md
const CONTENT = `
## はじめに
- このサイトは音楽練習が可能な公共施設の予約状況・施設情報を閲覧するためのものです。

## 機能の説明
### 予約状況検索機能
- 公共施設の予約状況を予約システムから取得し、加工して表示しています。

### 施設情報検索機能
- 公共施設の施設情報をウェブサイトから取得し、加工して表示しています。

## 対応地区
- 江東区
- 文京区
- 北区
- 豊島区
- 江戸川区
- 荒川区

## 備考
- 利用にはログインを必須としております。
- 表示されている情報に関し、当サイトはいかなる責任も負いません。
- 音楽練習の条件は広めにとっており、例えば少人数・弦楽器のみという場所も含まれています。
- PC環境での利用を推奨しております。
`;
