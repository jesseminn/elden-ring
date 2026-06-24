# 艾爾登法環 流程攻略追蹤器

一個用來「呈現並追蹤」艾爾登法環（Elden Ring）通關流程的網頁工具，依據巴哈姆特
**《艾爾登法環》個人筆記式攻略（作者 A.C / feiouex）** 整理而成，並以
**【手把手帶你做全支線】** 作為輔助。

解決使用線性攻略時的兩個痛點：

1. **細節要自己另外查** —— 每個步驟保留攻略原文細節，並標出該步可取得的**收集品**
   （製作筆記、護符、黃金種子、骨灰、聖杯露滴…）與 **Boss 戰**。
2. **支線散落各章、看不到全貌** —— 把分散在各章的 NPC 支線**聚合成單一時間軸**，
   一眼看出整條支線的全貌、已完成到哪、**下一步是什麼**。

## 功能

- **📜 線性流程**：依攻略 23 個章節順序勾選追蹤，含建議等級 / 武器強化、收集品、
  Boss 標記、章節與總進度條。可「隱藏已完成」「只看主線章節」。
- **🧭 支線總覽**：33 條 NPC 支線 / 收集，每條以時間軸呈現完整步驟，標示
  ✓ 已完成、▶ 目前該做的下一步，以及每步所在章節。
- **⚔️ 配點計畫**：「盜賊 → 感應出血流」Lv5 → Lv200 逐級配點計畫書。輸入目前等級即顯示
  下一級該加哪個屬性、所需盧恩、里程碑說明，並以面板呈現八維屬性、出血流裝備解鎖狀態與
  完整配點時間軸。Lv5→57 對應實機存檔、Lv187 核心畢業（長牙雙太刀 + 完整血咒雙修）。
- **互相跳轉**：線性流程中每個支線步驟都有按鈕，點擊即可跳到該支線完整流程；
  支線時間軸中也可點「第 N 章 ›」跳回線性流程對應步驟。
- **進度自動保存**：完全離線，進度（含配點目前等級）存於瀏覽器 `localStorage`。

## 架構（三層）

| 層級     | 說明                       | 位置 |
|----------|----------------------------|------|
| **文件** | source of truth，攻略原文   | `data/source/main-guide.txt`（主）、`aux-guide.txt`（輔） |
| **資料** | 把文件整理成程式可讀的資料  | `scripts/parse.py` → `src/data/walkthrough.json` |
| **程式** | UI / 功能（React + TS）     | `src/` |

> 文件取自原 PDF，內含「康熙部首 / CJK 部首補充」相容字（例如 `⼭⼈⼤` 其實不是
> 正常的「山人大」），會破壞中文比對。`scripts/parse.py` 會做**選擇性正規化**：
> 還原部首字為正常漢字，同時**保留官方全形標點**（，。「」、（））。

### 資料模型

```
chapters[]  章節（區域）：num / title / level / upgrade / nonMainline / steps[]
  steps[]   步驟：type(event|optional|note) / text / detail[] / items[] / boss / quests[]
quests[]    支線：id / name / desc / color / major / stepIds[]（依流程順序）
```

支線聚合方式：在 `parse.py` 的 `QUESTS` 定義每條支線的 NPC 名稱與別名，
解析時凡步驟文字含該別名即歸入該支線。要調整歸類，改 `QUESTS` 後重跑即可。

## 開發

需求：Node 18+、Python 3。

```bash
npm install

npm run data     # 解析文件 → src/data/walkthrough.json（修改攻略文字或 QUESTS 後執行）
npm run dev      # 本地開發伺服器
npm run build    # 產生 dist/（靜態檔，可直接部署）
npm run preview  # 預覽 build 結果
npm run smoke    # 用 jsdom 對 dist 做渲染 / 互動煙霧測試（需先 build）
```

## 部署

線上站：**https://jesseminn.github.io/elden-ring/**（GitHub Pages，由
`.github/workflows/deploy.yml` 部署）。

**部署＝打 semver 版本 tag**（推 `main` 本身不會部署，只是存檔）：

```bash
# 1) 先把 package.json 的 version 同步到要發的版號
# 2) 推一個版本 tag，這個 push 才會觸發部署
git tag v1.2.0 && git push origin v1.2.0
```

首頁標題旁會顯示當前版本（`v1.x.x`）：部署時由 workflow 以 tag 名注入
`__APP_VERSION__`，本地建置則退回 `package.json` 的 `version`。因為只有一個站，
**首頁版本＝線上版本＝最後打的 tag**。

`workflow_dispatch` 為手動逃生口，並可帶 `tag` 輸入——有給時由 Action 在 runner 端
建立並推送該 tag、同一個 run 內部署（給無法從本機 push tag 的環境用）。

> `npm run build` 後的 `dist/` 是純靜態檔，也可放任何靜態主機或本機直接開啟；
> `vite.config.ts` 的 `base` 設為相對路徑，部署在子路徑也能運作。

## 資料來源

- 主：[《艾爾登法環》個人筆記式攻略 — A.C / feiouex](https://home.gamer.com.tw/artwork.php?sn=5419567)
- 輔（支線）：[手把手帶你做全支線 看完全劇情](https://forum.gamer.com.tw/C.php?bsn=36726&snA=4050)
- 參考（流程順序／建議等級／地下城分級）：[Fextralife — Game Progress Route](https://eldenring.wiki.fextralife.com/Game+Progress+Route)（補完版見同站 [Walkthrough](https://eldenring.wiki.fextralife.com/Walkthrough)）

> feiouex 為地基（任務／劇情／拿寶完整）；Fextralife Game Progress Route 用於補「逐區建議等級」與
> 「地下城 Boss/挑戰分級」——兩者等級互相吻合，故以前者為主、後者校正節奏。

本工具僅整理流程供個人追蹤之用，攻略內容版權屬原作者。
