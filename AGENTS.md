# teach-math-games（國中數學遊戲場）專案藍圖

> 本檔為跨 Agent 通用的專案藍圖（AGENTS.md 開放標準）。任何 Agent 的每個 session 都應先讀本檔＋`handoff.md`。
> Claude Code 預設只在沒有 `CLAUDE.md` 時才讀 `AGENTS.md`，故由 `CLAUDE.md` 的 `@AGENTS.md` import 本檔（`CLAUDE.md` 只有這一行）；Claude 專屬規範寫在本檔〈Claude Code 專屬〉一節。

## 專案簡介

國中數學課堂小遊戲合集，靜態網站，供智慧白板與學生手機操作。從 [teach-math-web](https://changyiwu.github.io/teach-math-web/) 的 `games/` 拆出獨立維護；教學網側欄以外部連結指向本站各遊戲。

## 關鍵時程

## 目標與路線圖

- [x] 階段一：從 teach-math-web 搬出「次方大挑戰」，建立遊戲大廳首頁
- [x] 階段二：部署 GitHub Pages，教學網側欄改連到本站（側欄卡片指向大廳首頁）
- [ ] 階段三：陸續新增其他數學遊戲

## 資料夾結構

| 位置 | 用途 |
|---|---|
| `index.html` | 遊戲大廳：每款遊戲一張卡片 |
| `README.md` | 對外說明：使用情境、遊戲清單、課堂操作小抄 |
| `header-logo.svg` | 全站 favicon（與 teach-math-web 相同） |
| `power-challenge/` | 次方大挑戰（1 上 1-4）：`index.html` 遊戲本體、`learn.html` 次方教學表 |
| `exponent-rules/` | 指數律對錯快判（1 上 2-4）：`index.html` 遊戲本體、`learn.html` 指數律小抄 |
| `equation-steps/` | 移項闖關（1 上 3-2）：`index.html` 遊戲本體、`learn.html` 移項法則小抄 |
| `expression-simplify/` | 化簡對錯快判（1 下 1-1）：`index.html` 遊戲本體、`learn.html` 化簡小抄 |
| `elimination-steps/` | 消去闖關（1 下 1-2）：`index.html` 遊戲本體、`learn.html` 消去法小抄 |
| `coordinate-strike/` | 坐標點點打擊（1 下 2-1）：`index.html` 遊戲本體、`learn.html` 坐標小抄 |
| `proportion-sort/` | 正比反比快分類（1 下 3-2）：`index.html` 遊戲本體、`learn.html` 正比反比小抄 |
| `inequality-line/` | 數線畫解（1 下 4-1）：`index.html` 遊戲本體、`learn.html` 數線畫解小抄 |
| `data-center/` | 代表值快判（1 下 5-1）：`index.html` 遊戲本體、`learn.html` 代表值小抄 |
| `three-views/` | 三視圖積木（1 下 6-1）：`index.html` 遊戲本體、`learn.html` 三視圖小抄 |
| `area-puzzle/` | 面積拼圖（2 上 1-1）：`index.html` 遊戲本體、`learn.html` 乘法公式小抄 |
| `sqrt-zoom/` | 根號放大鏡（2 上 2-1）：`index.html` 遊戲本體、`learn.html` 根號小抄 |
| `cross-factor/` | 十字交乘填格（2 上 3-2）：`index.html` 遊戲本體、`learn.html` 十字交乘小抄 |
| `output/` | 產出物（不進 git） |

## 專案專屬規則

- **一款遊戲一個子資料夾**（英文 kebab-case），入口為該資料夾的 `index.html`；新增遊戲後要在大廳 `index.html` 對應冊別的 `<section id="book-N">` 內補一張卡片（該冊原本是「敬請期待」就換成 `.grid`），並視需要在 teach-math-web 的 `tools-sidebar.js` 加連結。
- 純靜態 HTML／CSS／JS，不需建置步驟；外部函式庫只用固定版本的 CDN。
- 遊戲頁的「回遊戲大廳」連結用相對路徑 `../index.html`，favicon 用 `../header-logo.svg`。
- 數學內容（題目、記號、用語）遵循 teach-math-web 的共用正本 `docs/reference/shared-math/math-rules.md` 與 `chapter-notes.md`，不在本 repo 另存副本。
- 畫面需同時適用智慧白板（大字、觸控）與手機寬度。
- **遊戲一律設計成「一台裝置、一個人操作、全班觀戰」**：課堂情境是投在大螢幕叫學生上台挑戰，不可假設每個學生都有手機或平板，也不要做需要全班同時連線、掃 QR、分組帳號的玩法（那類互動交給 `audience-poll`／`audience-wordcloud` 之類的獨立工具）。學生回家用手機自己玩是第二順位情境，版面要撐得住。
- 遊戲不記成績、不需登入；設定（限時、難度、音效）用 `localStorage` 記在該台瀏覽器即可；每款遊戲的 key 用自己的前綴，不可和既有的撞名（`power-` 次方大挑戰、`exp-` 指數律、`es-` 移項闖關、`simp-` 化簡對錯快判、`elim-` 消去闖關、`coord-` 坐標點點打擊、`prop-` 正比反比快分類、`iline-` 數線畫解、`dc-` 代表值快判、`tv-` 三視圖積木、`area-` 面積拼圖、`sz-` 根號放大鏡、`cf-` 十字交乘填格）。
- 新增遊戲時同步更新 `README.md` 的〈遊戲清單〉。
- 每款遊戲都要標「課本範圍」，格式統一為「第N冊・第N章 章名・第N節 節名」（章節名以 teach-math-web 的 `docs/reference/book-N.md` 為準），寫在三處：大廳卡片的 `.unit` 區塊、遊戲開始畫面標題下一行、README〈遊戲清單〉的「課本範圍」欄。

## 同步層級（本專案初始化至第 3 層級）

| 層級 | 平台 | 位置 | 讀取時機 |
|------|------|------|---------|
| L1 | 本地（GDrive） | `AGENTS.md`＋`handoff.md`（不進 git，只走雲端硬碟）＋`CLAUDE.md`（橋接） | 每個 session |
| L2 | GitHub | [changyiwu/teach-math-games](https://github.com/changyiwu/teach-math-games)（公開）；Pages：<https://changyiwu.github.io/teach-math-games/>（main 根目錄） | 指定時 |
| L3 | Obsidian | `teach-math-games/專案工作流程.md` | 有需要時 |

## 三個檔案的職責（依「時效性」分家，不是依「詳細程度」）

| 檔案 | 時效 | 寫入方式 | 放什麼 |
|------|------|---------|--------|
| `handoff.md` | **只對下一個 session 有效**，過期即丟 | 每次收工**整份重寫** | 做到哪、下一步、**這次**的暫時 workaround |
| `AGENTS.md`（本檔） | **長期有效**，每個 session 都適用 | 只有規則本身變了才改 | 目標、路線圖、常設規則、結構 |
| Obsidian（L3）／`git log` | **歷史**：發生過什麼、為什麼 | 只增不刪 | 決策紀錄、踩坑完整版、逐次進度 |

驗收標準：**`handoff.md` 整份刪掉，不應損失任何長期資訊**——會的話代表該升級進本檔卻沒升級。

**本檔不要出現的東西**（會無限膨脹，且開工每次都要重讀）：
- ❌ `## 最近進度`／逐次工作紀錄 → 有 L3 寫 Obsidian「🗓️ 最近更動紀錄」；沒有就靠 `git log`（所以 commit 訊息要寫「做什麼＋為什麼」）
- ❌ 決策記錄、取捨理由、踩坑經過的完整版 → Obsidian「決策紀錄」「🕳️ 踩坑筆記」
- ✅ 只留「結論式的規則」：踩過的坑收斂成一條**祈使句**寫進〈工作約定〉或〈專案專屬規則〉，理由那一大段留在 Obsidian

## 工作約定

- 任何 Agent、任何電腦：**開工先讀 `handoff.md`，收工必更新 `handoff.md`**
- `handoff.md` **不進 git**（含真實電腦名與本機絕對路徑），已列入 `.gitignore`，跨電腦靠雲端硬碟同步——不要把它加回版控
- 修改共用檔案前先讀最新內容，避免覆蓋其他 Agent 的變更
- 所有回應與文件使用繁體中文；Windows 優先用 PowerShell
- 修改前先確認計畫，優先保留原有資料結構
- commit／push 必須有使用者明確授權；只 stage 本次相關檔案
- PowerShell 下多行 commit 訊息先寫進暫存檔，再 `git commit -F <檔案>`；不要用 `-F -` 搭配 here-string（會被當成路徑而失敗）
- 遊戲 HTML 裡要顯示的 `<`、`>` 一律寫成 `&lt;`、`&gt;`
- 讀康軒備課 PDF 不要用 Git Bash 內建的 `pdftotext`（缺 `Adobe-CNS1`，中文全變空白）；改用 `uv run --with pypdf` 把需要的頁拆成小 PDF，再用 Read 工具直接讀
- **產出一律放 `output/`**：本專案產生的檔案或資料夾（成品、匯出、報表、生成圖、渲染等）預設放專案根目錄的 `output/`，不另開 `outputs/`、`exports/`、`generated/`、`out/` 之類的資料夾，方便找；`output/` 不進 git。部署工具指定的建置目錄（`dist/`、`build/`）不在此限
