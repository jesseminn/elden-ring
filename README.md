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

`npm run build` 後的 `dist/` 為純靜態檔，可直接放上 GitHub Pages、Netlify、
任何靜態主機，或本機直接開啟。`vite.config.ts` 已將 `base` 設為相對路徑，
部署在子路徑也能正常運作。

## 資料來源

- 主：[《艾爾登法環》個人筆記式攻略 — A.C / feiouex](https://home.gamer.com.tw/artwork.php?sn=5419567)
- 輔：[手把手帶你做全支線 看完全劇情](https://forum.gamer.com.tw/C.php?bsn=36726&snA=4050)

本工具僅整理流程供個人追蹤之用，攻略內容版權屬原作者。
