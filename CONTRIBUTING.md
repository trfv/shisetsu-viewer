# CONTRIBUTING

## Setup

### Install Node

[Node.js (LTS)](https://nodejs.org/) から LTS をインストールしてください。

### Install dependencies

```sh
git clone https://github.com/trfv/shisetsu-viewer
cd shisetsu-viewer
npm ci
```

## Command

### Run

```sh
npm start
```

### Build and Serve

```sh
npm run build & npm run serve
```

## Env

現時点では、動作確認するために `.env` が必要となっています。管理者に問い合わせください。

## Structure

### api

graphql 関連のコードを格納しています。
graphql-client.tsx は `npm run generate` で自動生成されたものになります。graphql-codegen というライブラリを利用しています。

### components

再利用できるコンポーネントを配置しています。
ベースとして mui というライブラリを利用しており、それをラップするだけのコンポーネントも存在します。
storybook が作成されているコンポーネントもあります。

### constants

定数定義を置く場所です。municipality というディレクトリ以下に、各地区の区分値を定義しています。

### contexts

Provider, Context を定義している場所です。

### hooks

カスタム hooks を定義している場所です。

### pages

ページを配置しています。

### utils

置き場所に困ったものを雑多に置いています。

依存関係としては概ね以下のように意識して書いています。

```
constants, fonts
↑
utils, hooks, contexts
↑
apis
↑
components
↑
pages
```
