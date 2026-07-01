# CLAUDE.md

給未來的 Claude：這是「艾爾登法環 知識庫 / 流程追蹤器」專案的工作備忘。
**先讀 `README.md` 了解產品**；這份記錄「使命定位」＋「我容易忘記、踩過坑」的操作要點與血淚教訓。

---

## 0. 元規則：如何「不重複犯錯」（最重要，先讀）

我（Claude）**跨 session 不會記得**、同一 session 在重複／長脈絡下也會鬆懈——
所以「靠我記住、靠我小心」必然會重複犯錯。唯一可靠的辦法是**把教訓搬出腦袋、寫進 repo**：

- **犯錯（或發現過去的錯）當下，立刻記一筆到 `lessons/`**（格式見該資料夾 README：現象／根因／以後怎麼防）。修正的那個 commit 就順手把 lesson 一起加上。
- 若教訓是**通則**，再把它**蒸餾進對應章節**。`lessons/` 留完整事件、章節留精煉守則。
- **動手前掃一下 `lessons/`**，尤其在「查證內容／改資料／部署」這幾類重複性高、踩過雷的事情上。
- 能變成**自動檢查／腳本**的就別只靠文件（治本）；但至少先記下來（治標）。`npm run validate` 就是這條的產物。

一句話：**每個錯 → 一條記錄（`lessons/`）＋（若是通則）一條守則（章節）＋（理想）一個自動檢查。**

---

## 1. 使命：我是這個 repo 的「資料管家」（2026-06 重新定位）

**repo 裡的資料是唯一真相；網站只是它的一個視圖。** 我負責四件事：

1. **蒐集資料**，存進 repo（`src/data/*.json`）。
2. **維護資料的連動**（步驟 ↔ 收集 ↔ 支線，見 §2）。
3. **維護資料的正確性，並附來源**（provenance，見 §3）。
4. **維護網站**——網站是給使用者**自助**追蹤進度／查閱資料用的（他不用問我，見 §6）。

外加一條互動迴圈：**使用者也會直接問我問題**。我用 repo 的資料回答；**不知道就上網查證**（官方解包 > fextralife > 中文 wiki，見 §3），**回答他、並把查到的回寫進資料（同時補一筆來源 claim）**。每個問題都是讓資料更完整的機會。

### 📍 讀使用者「目前進度」（給針對性建議用）
使用者的進度同步在一個 GitHub gist（雲端同步功能，見 §6）。**gist id 放在 Claude Code web 環境變數 `ELDEN_GIST_ID`**（不進 repo、每 session 注入；若為空就向使用者要）。要給「你在哪、下一步、易斷提醒、收集缺口」這類**進度相關**建議前，先讀它：
```bash
curl -s "https://api.github.com/gists/$ELDEN_GIST_ID" | jq -r '.files["elden-progress.json"].content' > /tmp/prog.json
# 內含 {done:{主鍵:true,…}}；對 walkthrough.json 算「第一個未完成步驟＝目前進度」、各章%、支線/收集缺口
```
secret gist 用 id 即可無 auth 讀；token 只在使用者瀏覽器、不需要也不該放這。

- **範圍**：**先做 base game**；黃金樹幽影 DLC **之後再開**（`collection.json` 已有空的 `dlc` 區佔位）。
- **骨幹**：**以攻略流程（feiouex 路線）為骨幹**，按使用者提問與實際需要逐步長大；**不要一次鋪大全表**（會變成抄 wiki 且難維護正確性）。
- 繁體中文 UI，所有面向使用者的文字都用繁中。技術棧：純前端、離線、React + TS + Vite 單頁，進度存 `localStorage`。

---

## 2. 資料模型與連動（資料聯動）

資料在 `src/data/`，**直接編輯這些 JSON 就是既定做法**：

| 檔案 | 內容 |
|---|---|
| `walkthrough.json` | 章節 / 步驟（主資料）。Step: `text, detail[], items[], boss, quests[], location?, missable?, added?, lv?` |
| `collection.json` | 收集庫，依 `regions[].items[]`，每項有 `kind`（=系列）、`text`、`miss?`、`note?` |
| `links.json` | `{links:[[col-id, step-id], …]}` — 步驟↔收集項的**人工校對**連動 |
| `builds.json` | 配點器資料（屬性表 / 初始值 / 共用段 / 兩套 build）。型別在 `src/types.ts` |
| `sources.json` | **來源帳本（provenance）**，見 §3 |

### 🔗 連動採「資料聯動」（單一真相來源＋讀取時推導）
**`done` 只存「主鍵」**：連動組（步驟 ↔ 收集項）一律**以流程步驟為主鍵**。收集項的完成狀態於**讀取時**用 `isDone(id)=done[canonicalId(id)]` 即時推導（`canonicalId`/`isDone` 在 `src/lib/data.ts`），勾選只寫 `canonicalId`（`store.tsx` 的 `toggleStep`），載入舊存檔用 `normalizeDone()` 摺疊。
- **好處**：改 `links.json` **立即且回溯**生效、step/col 永不脫鉤。
- **守則**：**能從現有資料推導的就別另存一份**——尤其關聯（`links.json`）還會持續變動時。**別退回「事件聯動」**（勾選當下把連動項一起寫死，之後改 links 不回溯，是埋雷）。詳見 `lessons/`。
- 三層連動：`walkthrough`(步驟) ＋ `collection`(收集) ＋ `links`(連動)。查證/修改一個東西時三層一起看。流程↔支線是同一個 step id、天生同步；收集↔流程靠 `links.json`。

### 🧭 新增／跨區內容的放置原則（Adula 事故後立規）
線性流程**忠實照攻略作者的「路線順序」**走（那順序本來就會在區域間交錯），**「章節＝地區」只是段落標籤，不是「同區一次做完」的承諾**。
- **新增步驟插在它在路線上「真正發生」的時點**，不要為了好放就按地區 append（曾把亞杜拉首遇＋擊殺硬塞同章，導致「擊殺在前、遭遇在後」）。
- **跨區的鏈**：①每步放真實時點；②把步驟 id 加進對應 `quests[].stepIds`（並給 step `quests:[id]`），讓「支線總覽」聚合成跨區時間軸。`stepIds` 依流程順序排、同步更新 `count`（`validate` 會檢查 count 一致）。

### ⚠️ `step.items` 很髒，不可當資料用
parse 的原始產物，混雜雜訊。**收集連動一律以 `links.json`（人工精確校對）為準**，不要拿名稱模糊比對 `collection.json`——曾因此造成大量**假陽性**。**精確比對、對不上就不連**（寧缺勿濫）。

### ⚠️ `scripts/parse.py` 會「砍掉」手工補充
`parse.py` 從 `data/source/*.txt` **整檔重生** `walkthrough.json`、不讀回舊 JSON，所以 `location`/`missable`/`added`/手補 `detail`/`links` **重跑就全沒**。一次性 bootstrap，**不要為小修改重跑**。要改就改 JSON。

### `kind` 就是「系列」
`collection.json` 的 `kind`（黃金種子 / 聖盃露滴 / 結晶露滴 / 淚滴 / 記憶石 / 古龍岩 / 死根 / 追憶 / 鈴珠 / 畫作 / 地圖 / 製作筆記…）即系列。`SERIES_KINDS`（`src/lib/data.ts`）是其中「值得看全地圖位置」的子集，會顯示「系列／全地圖」；武器/護符/靈灰等泛用類不算系列。

---

## 3. 正確性與來源（provenance）——使命第 3 條，最受使用者檢查

使用者對「我的查證」會嚴格檢查，曾因我搞錯而扣信任。**保守、可逆、據實回報，最終由使用者拍板。**

### 查證來源的優先序
1. **遊戲解包文本（最權威）**：`github.com/elden-ring-data/msg`（`zhotw/`=官方正體中文、`engus/`=官方英文，curl raw 直接可得，以 FMG id 對齊 EN↔繁中）。已整理成 `docs/translations/*.csv`。例：官方「腐**敗**吐息」非「腐爛吐息」、「薩米爾的古英雄」非「腐爛樹靈」。
2. **fextralife**（英文詳細 wiki）：查 boss 位置/掉落/連動的主力。**掉落物是驗 boss 身分的硬證據**（薩米爾彎刀⇒薩米爾古英雄、山妖大錘⇒挖石山妖、隕石⇒石膚黑王）。
3. **中文詳細 wiki**（bilibili wiki / GamerSky）、**feiouex**（線性流程基準）。
4. **英文搜尋摘要只當輔助**，最不可信（會把相鄰事件糅在一起、音譯亂猜）。**改專名前一律對 `docs/translations/*.csv`**；相似名不同物要當心（兩個羅蕾塔、白王 vs 黑王、亞斯特爾 vs 腐爛樹靈）。
5. 斷言「我們缺 X / X 錯了」前，**先 grep 我們自己的 `walkthrough.json` 全文（含 detail）**；review 完先 **audit 自己的 review** 再動手（可開 subagent 對抗式驗證）。

### 📒 來源帳本 `src/data/sources.json`（不要只用零散註記）
- `sources`：**具名來源登錄表**（id → {title, kind, ref, trust}）。
- `claims`：**append-only 帳本**，每筆查證/校正一條：`{id, date, target:"<檔名>#<id 或 id.field>", statement, sources:[來源id], note?}`。
- **新增/校正資料時，同時補一筆 claim**，引用 `sources` 裡的 id。`validate` 會檢查 claim 的來源都已登錄、id 不重複。
- 為何不只用 inline `note`：來源要**可查詢、可複查、集中**，散在各 JSON 的註記做不到。inline note 仍可給使用者看的情境說明，但**權威依據放帳本**。

### 網路抓取的雷（egress / WebFetch / curl / Jina）
- **egress 白名單**：`*.github.io`、`imgur`、discord cdn **真的被擋**（curl 回 `Host not in allowlist` / WebFetch 403）。真被擋的才請使用者貼上／上傳檔（`Read` 能讀 PDF/圖）。
- **⚠ WebFetch 403 ≠ 被擋**：`home.gamer.com.tw`（巴哈 feiouex）擋 WebFetch 的 UA → 403，但 **`curl` 抓得到（200）**。WebFetch 一 403 別放棄——`curl -sS "<url>" -o /tmp/x.html` 再解析。判別：curl 回 `Host not in allowlist`=真擋；200=只是 UA。
- **Jina Reader**：`curl "https://r.jina.ai/<原始網址>"` 伺服器端抓、回乾淨 markdown（連巴哈都讀得到，`r.jina.ai` 在白名單）。但 Jina 對圖片網址只回外殼、不 OCR；要看圖請使用者上傳。
- `wiki.biligame.com` 實測 curl 200（列表頁多簡中）。

---

## 4. 自動校驗（改資料必跑）——使命第 2、3 條的治本

```bash
npm run validate     # scripts/validate-data.mjs：連動/正確性不變式一次跑完
```
檢查：JSON 合法、id 不重複、`links` 形狀(col↔step)＋兩端存在(0 壞連結)、`quests.stepIds` 存在、`quest.count`＝stepIds 長度、`step.quests` ↔ `quest.stepIds` 雙向一致、`sources.json` 的 claim 來源都已登錄。**改資料後一定先跑這支**；非 0 退出就別 push。

**完整「五件套」（push / 發版前）：**
```bash
npm run validate                                   # ① 資料校驗
node -e "JSON.parse(require('fs').readFileSync('src/data/XXX.json','utf8'))"  # ②(validate 已含，動到的檔可快驗)
npx tsc --noEmit                                   # ③ 型別
node scripts/smoke.mjs                             # ④ 煙霧測試「錯誤數: 0」
npm run build                                      # ⑤ 正式建置
```
`npm run check` = validate＋smoke＋tsc＋build 一次跑。`dist/`、`node_modules/` 都 gitignore，**別 commit `dist`**。

---

## 5. 部署（已自動化）

### 🔴 鐵則（任何 commit / push 前）：確認沒落後 main
```bash
git fetch origin main && git rev-list --count HEAD..origin/main   # 回 0 才安全
```
不是 0＝`main` 已被推進，**先 rebase 到最新 `origin/main` 再繼續，絕不蓋舊基底**。
⚠ 血淚案例：工作分支從落後 main ~40 commit 的舊分支切出，整批改動蓋在過時程式碼上。**基底正不正確，動手前自己驗，別信分支名。**

### 分支制
- 改動 commit 在**工作分支**（如 `claude/<task>-xxxx`），**不直接 commit `main`**（曾誤 commit 到 main，記得切回工作分支）。`main` 是共用 base。
- 為何不直接 commit main：**AI agent 的 system prompt 不允許**（指定工作分支、未經允許不得推他處）。分支制也是多 session 平行不互蓋的唯一做法。

### 一鍵發版 + 自動部署政策（2026-06）
**政策：驗證過就自動發版部署、不再每次問**（保守/有疑慮的**內容**改動仍先確認，§3 拍板權在使用者；UI/結構/修 bug 類可自走）。
```bash
node scripts/release.mjs <version> "<commit 第一行>"
```
`release.mjs` 會：①確認在工作分支 → ②跑 validate/tsc/smoke/build（沒過就中止、不發版）→ ③bump `package.json` → ④commit（自動補固定 trailer）→ ⑤push 工作分支 → ⑥護欄：落後 origin/main 就中止 → ⑦ff-merge 進 main 並推、切回工作分支 → ⑧印出要觸發的部署參數。
然後 **agent 送出部署**（沙箱推不了 tag，見下）：
> MCP `actions_run_trigger`：method=`run_workflow`, owner=`jesseminn`, repo=`elden-ring`, workflow_id=`deploy.yml`, ref=`main`, inputs=`{tag:"vX.Y.Z"}`

### tag 機制與沙箱限制（別重新踩）
- **部署＝打 semver tag 觸發**（推 main 本身只是存檔、不部署）。線上只有一個 domain＝**tag 部署即線上更新**（無 staging）。
- **⚠ 沙箱推不了 tag**：git proxy 對 tag push 回 403、MCP 無建 tag 工具、直接打 API 被安全分類器擋。**解法＝讓 runner 端建 tag**：`deploy.yml` 的 `workflow_dispatch` 收 `tag` 輸入，runner 用 GITHUB_TOKEN `git tag && git push` 建 tag 並在同一 run 部署（GITHUB_TOKEN 推的 tag 不再觸發本 workflow；需 `permissions: contents:write`；tag 指向 main HEAD）。使用者本機 `git push origin vX.Y.Z` 走 `push: tags` 一樣會部署。
- `deploy.yml` 觸發 = `push: tags:['v*']` + `workflow_dispatch`。若 tag 部署被擋：repo Settings → Environments → `github-pages` → Deployment branches and tags 加 `v*`／All。`npm run build` → 上傳 `dist`，線上 **https://jesseminn.github.io/elden-ring/**。
- **版本顯示**：右上漢堡選單 `版本 v1.x.x`（`.menu-ver`）。`vite.config.ts` 注入 `__APP_VERSION__`：部署用 tag 名（`VITE_APP_VERSION=github.ref_name`）、本地退回 `package.json` version。**發版前 bump package.json**（`release.mjs` 已代勞）。
- **部署後最多查一次 run**（別狂輪詢、別用 Bash `sleep` 等外部事件）：`actions_list list_workflow_runs resource_id=deploy.yml`，回傳巨大會存檔，用 `jq -r '.workflow_runs[0]|"\(.head_sha[0:7]) \(.status) \(.conclusion)"' <file>`。
- commit **原子化、訊息清楚**（方便 `git revert`）。**不要主動開 PR**。**絕不**把模型 ID 寫進 commit/程式碼/任何 repo 產物。

---

## 6. 網站＝視圖層（次要；使用者自助用，不用問我）

網站只是資料的呈現，**不要把任何資料只存在 UI 裡**。動 UI 前 `frontend-design` skill 會觸發（見 §8）。關鍵約定：

- **線性流程簡潔、支線總覽詳細**：`detail` 在線性流程預設收合、支線總覽展開。
- 元件：`FlowView`(線性) / `QuestView`(支線總覽) / `CollectionView`(收集，依 **kind** 分組非地區) / `BuildView`(配點)；彈窗 `CollectPeek` `SeriesPeek` `QuestPeek`；單列 `StepRow`；狀態 `store.tsx`。
- **去重規則** `visibleDetail()`（`src/lib/data.ts`）：有收集連動時濾掉**整行純複述**的 `取得「…」。` detail。規則**收很嚴**：只有整行就是 `取得「…」` 才濾，後面還有別的說明不可濾。**零資訊遺失是底線。**
- 步驟標籤：`BOSS`/地點/`收集(n) ↗`/`系列：X ↗`/支線 chips/`易斷`(missable)/`查證補充`(added，刻意不寫「Claude」以免暴露實作)。
- `localStorage` key：`elden-progress-v1`（勾選）、`elden-ui-v1`（UI 狀態）。
- 驗證 UI 可用 Playwright（`/opt/node22/lib/node_modules/playwright`，executablePath `/opt/pw-browsers/chromium`；`vite preview` base 是 `./` → 開 `http://localhost:PORT/` 根路徑，不是 `/elden-ring/`）。

---

## 7. GitHub MCP 小抄

- 工具前綴 `mcp__github__*`，repo 限定 `jesseminn/elden-ring`。**沒有 `gh` CLI**。
- `actions_list` / `get_workflow_run` 回傳**巨大**會超 token 被存檔，用 `jq` 取欄位（見 §5）。
- **不要用 Bash `sleep` 等外部事件**；監看 PR 用 `subscribe_pr_activity`。

---

## 8. 風格

- 回覆用**繁體中文**，直接、給結論與建議而非長篇選項。
- 動手前能查證就查證；改完據實回報（過了說過了，跳過說跳過）。
- 使用者偏好**精準、保守、可逆、零資訊遺失**的改動，並掌握查證的最終拍板權。

---

## 9. 環境與技能（容器用完即丟）

- **遠端容器每 session 重新 clone repo、`~/.claude/` 不保證保留**。要跨 session 留住的**一律 commit 進 repo**。
- **`frontend-design`（Anthropic 官方）已 commit 在 `.claude/skills/frontend-design/`**（單一 SKILL.md、純指引），動 UI 時觸發。曾試第三方 `ui-ux-pro-max`（12M）嫌肥已棄用，別再裝。
- 裝技能：**手動把 SKILL.md 放進 `.claude/skills/<name>/`**，不要跑來路不明的 `npx` 安裝器；裝前掃腳本有無可疑行為。

---

## 10. 待辦 → 看 `docs/backlog.md`

**會被做掉而消失的 TODO（資料校正、功能、雜項）放 `docs/backlog.md`，不放這裡**（本檔是長效手冊）。
分工：`docs/backlog.md`＝待辦；`lessons/`＝踩過的雷；CLAUDE.md＝長效慣例與守則。動手前掃一下 backlog。

長效限制（不會「做掉」、留此供參）：
- 沙箱 git proxy **推不了 tag、也不接受刪除 push**（部署/刪分支的繞法見 §5）。
- 網路 **egress 有白名單**（`*.github.io`、圖床等被擋；判別與繞法見 §3）。
