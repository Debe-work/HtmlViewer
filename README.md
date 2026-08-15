# HTML Viewer

GitHub 上の **任意のリポジトリ** にある HTML を、スマホからリッチプレビューするための静的アプリです。バックエンドはなく、GitHub Pages だけで動きます。

公開 URL（Pages 有効化後）: https://debe-work.github.io/HtmlViewer/

## できること

- `owner/repo` や GitHub / Gist の blob/raw URL を貼って、このリポジトリ以外の HTML も開く
- リポジトリをフォルダ単位でブラウズし、`.html` をタップして描画。プレビューからソース表示に切り替え可能
- 相対パスの CSS / JS / 画像を解決してプレビュー
- 任意の GitHub PAT をブラウザの localStorage に保存して private リポジトリや API 制限緩和に使う

GitHub は raw HTML を `text/plain` で返すため、ブラウザは描画しません。このアプリは GitHub API / raw から内容を取得し、サンドボックス iframe で表示します。ファイルの再ホストやダウンロードは不要です。

## 使い方

1. ホームで GitHub URL か `owner/repo` を入力する（例: `twbs/bootstrap`）
2. フォルダを辿り、HTML ファイルを開く
3. スマホなら「ホーム画面に追加」するとアプリっぽく使えます

GitHub のファイル画面から飛ばすブックマークレット:

```js
javascript:void(location.href='https://debe-work.github.io/HtmlViewer/#/preview?url='+encodeURIComponent(location.href))
```

ディープリンク形式は `#/preview?url=<github-or-gist-url>` です。

このリポジトリのサンプル:

`https://github.com/Debe-work/HtmlViewer/blob/main/examples/index.html`

## 開発

```sh
yarn
yarn dev
yarn test
yarn build
```

## GitHub Pages

Settings → Pages → Source を **GitHub Actions** にしてください。`main` への push でデプロイします。

## 制限

- 信頼できない HTML 向けではありません（個人用）
- `type="module"` の相対 import や Service Worker は動きません
- ブランチ名に `/` が含まれる URL の自動パースは弱いです。アプリ内のブランチ選択を使ってください
- 未認証の GitHub API は 60 req/hour です。PAT を推奨します
