# CLAUDE.md

給未來的 Claude：這是「艾爾登法環 流程攻略追蹤器」專案的工作備忘。
**先讀 `README.md` 了解產品**；這份只記錄「我容易忘記、踩過坑」的操作要點與血淚教訓。

---

## 1. 這專案是什麼（一句話）

純前端、離線、React + TS + Vite 的單頁工具，把一份巴哈攻略（A.C/feiouex）整理成
**①線性流程 ②支線總覽（時間軸聚合）③配點計畫**，進度存在 `localStorage`。
繁體中文 UI，所有面向使用者的文字都用繁中。

---

## 2. 開發 / 部署流程（最常忘）

- **單線開發：直接在 `main` 上 commit。`git push origin main` 本身「不」觸發部署。**
  （使用者於 2026-06 決定：單人專案、無測試環境、不跑本地測試、出問題用 git
  切回去即可，所以**不再用 feature 分支**。）
- **部署改為「打 semver tag 觸發」（2026-06 起，方案二精簡版）。** 平常推 main 只是存檔，
  **要更新線上站＝打一個版本 tag**：
  ```bash
  # 確認 §3 四件套都過、且 package.json version 已 bump 到要發的版號後：
  git tag v1.2.0 && git push origin v1.2.0   # 這個 push 才會觸發 GitHub Pages 部署
  ```
  流程：改完 → 問使用者「要不要打 tag 部署測試」→ 要的話才 tag。因為只有一個 domain，
  **tag 部署＝線上更新（沒有獨立 staging）**。
- **版本顯示**：首頁標題旁 `v1.x.x`（`.app-ver`）。版本由 `vite.config.ts` 注入
  `__APP_VERSION__`：部署時用 tag 名（workflow 的 `VITE_APP_VERSION=github.ref_name`），
  本地建置退回 `package.json` 的 `version`。**打 tag 前記得先把 `package.json` version 同步**。
- **deploy.yml 觸發條件 = `push: tags: ['v*']` + `workflow_dispatch`**（手動逃生口）。
  ⚠ 若 tag 部署被擋，到 repo Settings → Environments → `github-pages` → Deployment
  branches and tags 把 `v*`／All 加進允許清單。`npm run build` → 上傳 `dist`，
  線上網址 **https://jesseminn.github.io/elden-ring/**。部署完用 GitHub MCP 確認 run（見 §7）。
- **⚠ 沙箱推不了 tag，但有解（2026-06）**：git proxy 對 tag push 回 **HTTP 403**（只收分支；
  delete 也不收，同 §10）；GitHub MCP 沒有建 tag/release 工具；直接拿 session token 打 API 會被
  安全分類器擋（也不該繞）。**解法＝讓 GitHub Actions 在 runner 端自己建 tag**（官方機制）：
  `deploy.yml` 的 `workflow_dispatch` 收一個 `tag` 輸入，有給就在 runner 用 GITHUB_TOKEN
  `git tag && git push` 建立該 tag，並在**同一個 run** 內部署（GITHUB_TOKEN 推的 tag 不會再觸發
  本 workflow，故不靠重觸發；需 `permissions: contents: write`；tag 指向 main HEAD 才符合
  workflow-file 限制）。**Claude 打 tag＝MCP `actions_run_trigger` run_workflow,
  workflow_id=deploy.yml, ref=main, inputs={tag: "vX.Y.Z"}**（記得先 bump `package.json`）。
  使用者本機推 tag（`git push origin vX.Y.Z`）走 `push: tags` 那條一樣會部署。
- **鐵則：push 前一定先跑 §3 驗證四件套**，`tsc` / `smoke` / `build` 任一沒過就**不要 push**
  （使用者不跑本地測試，這層由 Claude 把關；壞掉的 build 部署會失敗，線上雖留著舊版但別污染 main）。
- commit 要**原子化、訊息清楚**，方便出事時 `git revert`。
- 攻略「內容查證」類改動仍要**保守、可逆、據實回報改了什麼**（最終由使用者拍板，見 §6）。
- **不要主動開 PR**。Commit 訊息結尾固定加：
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01641ouA7Q8DQbpBSZ9WYum3
  ```
  **絕不**把模型 ID 寫進 commit / 程式碼 / 任何 repo 產物。

---

## 3. 每次改完一定要跑的驗證（四件套）

```bash
node -e "JSON.parse(require('fs').readFileSync('src/data/XXX.json','utf8'))"  # JSON 合法
npx tsc --noEmit          # 型別（tsconfig strict + resolveJsonModule 已開）
node scripts/smoke.mjs    # 煙霧測試，看「錯誤數: 0」
npm run build             # 正式建置要過
```
`dist/` 與 `node_modules/` 都被 gitignore，**不要 commit `dist`**。

---

## 4. 資料檔與致命陷阱

資料在 `src/data/`，**直接編輯這些 JSON 就是既定做法**（型別註解寫「Claude 後補」）：

| 檔案 | 內容 |
|---|---|
| `walkthrough.json` | 章節 / 步驟（主資料）。Step: `text, detail[], items[], boss, quests[], location?, missable?, added?` |
| `collection.json` | 收集庫，依 `regions[].items[]`，每項有 `kind`（=系列）、`text`、`miss?`、`note?` |
| `links.json` | `{links:[[col-id, step-id], …]}` — 步驟↔收集項的人工校對連動 |
| `builds.json` | 配點器資料（屬性表 / 初始值 / 共用段 / 兩套 build）。型別在 `src/types.ts` |

### ⚠️ `scripts/parse.py` 會「砍掉」手工補充
`parse.py` 從 `data/source/*.txt` **整檔重生** `walkthrough.json`，**不會讀回舊 JSON**，
所以 `location` / `missable` / `added` / 手補的 `detail` / `links` **重跑就全沒了**。
它是一次性 bootstrap，**不要為了小修改去重跑它**。要改就改 JSON。

### ⚠️ `step.items` 很髒，不可當資料用
是 parse 的原始產物，混雜 `關卡前方`、`「無頭騎士`（括號殘缺）、`彈指` 等雜訊。
**收集相關一律以 `links.json`（人工校對）為準**，不要用 `step.items` 或拿名稱去
模糊比對 `collection.json`——曾因 `text.split('（')[0]` 對到空字串造成大量**假陽性**
（全被配到「D 的弟弟裝備」那種條目）。要連動就老老實實精確比對、對不上就**不連**。

### `kind` 就是「系列」
`collection.json` 的 `kind`（黃金種子 / 聖盃露滴 / 淚滴 / 記憶石 / 古龍岩 / 死根 /
追憶 / 符節 / 畫作 / 地圖 / 製作筆記…）即系列概念。`SERIES_KINDS`（在 `src/lib/data.ts`）
是其中「值得看全地圖位置」的子集；武器/護符/靈灰等泛用類**不算系列**、不顯示「系列」標籤。

---

## 5. UI 的關鍵設計約定

- **線性流程簡潔、支線總覽詳細**：`detail` 在線性流程預設收合、在支線總覽展開。
- 線性流程每步的標籤（`StepRow.tsx`）：`BOSS` / 地點 / **`收集(n) ↗`**（開 `CollectPeek`）/
  **`系列：X ↗`**（開 `SeriesPeek`）/ 支線 chips / `易斷`(missable) / `查證補充`(added，UI 標籤；
  刻意不寫「Claude」以免暴露實作）。
- **去重規則**（`visibleDetail()` in `src/lib/data.ts`）：當某步有收集連動時，濾掉
  **「整行純複述」**的 `取得「…」。` detail（避免和收集標籤重複）。規則**收得很嚴**：
  只有整行就是 `取得「…」` 才濾——後面還有別的說明（例如「菇菇人王冠要到腐敗湖才能入手」）
  **不可濾掉**。無收集連動的步驟一律保留原文，**零資訊遺失**是底線。
- 元件：`FlowView`(線性) / `QuestView`(支線總覽) / `BuildView`(配點) / `CollectionView`，
  彈窗 `CollectPeek` `SeriesPeek` `QuestPeek`，單列 `StepRow`，狀態 `store.tsx`。
- 狀態：`localStorage` key = `elden-progress-v1`（勾選）、`elden-ui-v1`（UI 狀態）。
  收集項的勾選和步驟共用同一個 `toggleStep`（靠 `links.json` 同步）。

---

## 6. 查證攻略內容的教訓（很重要）

使用者對「我的查證」會嚴格檢查，曾因我搞錯而扣信任。準則：

- **中文詳細 wiki（如 bilibili wiki / GamerSky）是主要查證來源**；英文搜尋摘要只當輔助。
  曾犯：英文摘要把**相鄰事件糅在一起**（把亞歷山大「利耶尼亞油壺解救」誤接成
  「格密爾熔岩土龍」），導致我反過來誤判**原始資料其實是對的**。教訓：
  **多個來源交叉比對；改別人原文前要有把握；沒把握就用「附加註記」而非改寫/刪除。**
- **網路 egress 有白名單**：`*.github.io`、`imgur`、discord cdn 等**真的被擋**（Bash `curl` 回
  `Host not in allowlist` / `Blocked by egress policy`，WebFetch 回 403）。真被擋的才需
  **請使用者貼上或上傳 PDF/圖檔**（`Read` 能讀），別假裝查得到。
- **⚠ WebFetch 403 ≠ 被 egress 擋**：`home.gamer.com.tw`（巴哈，含 **feiouex 攻略/武器/護符一覽**）
  會擋 WebFetch 的 User-Agent → 回 **403**，但 **Bash `curl` 抓得到（200）**！所以 WebFetch 一 403
  別急著放棄或推給使用者——**先用 `curl -sS "<url>" -o /tmp/x.html` 拉下來，再用 python 去標籤解析**
  （查武器/護符官方繁中名超好用）。判別法：`curl` 回 `Host not in allowlist`=真被擋；回 200=只是 UA 問題。
  - 補充：`wiki.biligame.com` 本 session 實測 curl **200**（與本檔舊註記「被擋」相反），但列表頁多簡中、少英文。
- **讀網頁也可用 Jina Reader**：`curl "https://r.jina.ai/<原始網址>"`，伺服器端抓取、回乾淨 Markdown
  （連巴哈 `home.gamer.com.tw` 這種 WebFetch 被 403 擋的站也讀得到）。`r.jina.ai` 在白名單內。
  注意：**Jina 對「圖片網址」只回該圖床的網頁外殼、不會 OCR**，圖片內容繞不過 egress；
  要看圖請使用者**直接上傳圖檔**（`Read` 是視覺型，能看懂 PNG/JPG/WebP 的畫面與文字）。
  - 血淚案例（2026-06）：配點器武器名我一堆用英文搜尋摘要亂猜全錯（Blasphemous=褻瀆聖劍非「瀆神之劍」、
    Sacred Relic=神軀化劍、Bastard=混種大劍、Bolt of Gransax=古蘭桑克斯的雷電…），最後 curl 巴哈
    feiouex 武器一覽才一次校正乾淨。**官方繁中名一律以 feiouex 一覽／遊戲解包文本為準，別信英文摘要音譯。**
- **查官方繁中專名（武器/法術/Boss/地名…）最佳來源 = 遊戲解包文本**
  `github.com/elden-ring-data/msg`（`zhotw/`=官方正體中文、`engus/`=官方英文，curl raw 直接可得，
  以 FMG id 對齊即得官方 EN↔繁中）。已整理成 `docs/translations/*.csv`（見該資料夾 README）。
  比 feiouex/wiki 更權威（例：官方「腐**敗**吐息」非「腐爛吐息」）。
- 改攻略資料時**保守**：能附加就不改寫、能標註就不刪除；破壞性改動先確認。

---

## 7. GitHub MCP 小抄

- 工具前綴 `mcp__github__*`，repo 限定 `jesseminn/elden-ring`。**沒有 `gh` CLI**。
- `actions_list` / `get_workflow_run` 回傳**巨大**（含整個 repo 物件），會超 token 被存到檔。
  用 `jq` 取需要的欄位即可，例如：
  ```bash
  jq -r '.workflow_runs[0] | "\(.head_sha[0:7]) \(.status) \(.conclusion)"' <saved-file>
  ```
- 查部署：`actions_list method=list_workflow_runs resource_id=deploy.yml branch=main`，
  看最新 run 的 `status`(queued/in_progress/completed) 與 `conclusion`(success)。
- **不要用 Bash `sleep` 等外部事件**；要監看 PR 用 `subscribe_pr_activity`。

---

## 8. 風格

- 回覆用**繁體中文**，直接、給結論與建議而非長篇選項。
- 動手前能查證就查證；改完據實回報（過了就說過了，跳過就說跳過）。
- 使用者偏好**精準、保守、可逆、零資訊遺失**的改動，並且自己掌握查證的最終拍板權。

---

## 9. 環境與技能（容器是用完即丟）

- **遠端容器每個 session 重新 clone repo、家目錄 `~/.claude/` 不保證保留。**
  要跨 session 留住的東西**一律 commit 進 repo**。
- **設計類技能：`frontend-design`（Anthropic 官方）已 commit 在 `.claude/skills/frontend-design/`**
  （單一 SKILL.md，純指引、無腳本無相依，~28K），所以每個新 session clone 後就自動有。
  動 UI（`styles.css` / 版面 / 配色 / 字體）時會觸發；理念是「跳脫 AI 罐頭味、做有觀點的設計」。
  - 曾試過第三方 `ui-ux-pro-max`（12M repo、含 30 個 CSV + Python 搜尋腳本），**嫌太肥已棄用**，別再裝。
- 安裝技能的做法：**手動把 SKILL.md（必要時連同 scripts/data）放進 `.claude/skills/<name>/`**，
  **不要跑來路不明的 `npx` 安裝器**；裝前先掃腳本有無網路/`subprocess`/`eval` 等可疑行為。

---

## 10. 待辦 / 已知限制

- **遠端分支 `claude/elden-ring-strategy-tool-wqmtv8` 待手動刪除**：已合併進 main 後就多餘，
  但**沙箱 git proxy 不接受刪除 push、GitHub MCP 也沒有刪 ref 的工具**，所以只能請使用者
  到 GitHub 網頁 Branches 頁面刪。（本地分支已刪）
- 同理：`github.io`、`wiki.biligame.com` 等被 egress 白名單擋；`github.com` 本身可連
  （能 clone 官方 skills repo）。
