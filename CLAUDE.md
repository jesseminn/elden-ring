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

- **開發分支固定是 `claude/elden-ring-strategy-tool-wqmtv8`。** 所有 commit 推這條。
- **部署 = GitHub Pages，只在 push 到 `main` 時觸發**（`.github/workflows/deploy.yml`，
  build → `npm run build` → 上傳 `dist`）。沒有別的部署管線。
- **推 `main` 需要使用者明確同意**（每次部署他都會說「要」）。流程：
  ```
  git checkout main
  git merge --ff-only claude/elden-ring-strategy-tool-wqmtv8   # 一向能快轉
  git push origin main
  git checkout claude/elden-ring-strategy-tool-wqmtv8           # 切回來繼續開發
  ```
- 部署完用 GitHub MCP 確認 run 狀態（見 §7）。線上網址 **https://jesseminn.github.io/elden-ring/**。
- **不要主動開 PR**（除非使用者明說）。commit/push 才是常態。
- Commit 訊息結尾固定加：
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
- **網路 egress 有白名單**：`wiki.biligame.com`、`*.github.io` 等都被擋（curl 回
  `Host not in allowlist`，WebFetch 回 403）。需要這些內容時**請使用者貼上或上傳 PDF**
  （`Read` 能讀 PDF），不要假裝查得到。
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
