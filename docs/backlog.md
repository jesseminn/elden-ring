# Backlog — 待辦 / 積壓

給未來的 Claude：這裡是**會被「做掉」而消失的待辦**（資料校正、功能、雜項）。
- CLAUDE.md 是**長效操作手冊**，不放會過期的 TODO；`lessons/` 放**踩過的雷**；**待辦放這裡**。
- 做完一項就**從本檔刪掉**（git 史留紀錄）；資料校正做完別忘了在 `src/data/sources.json` 補一筆 claim。
- 動手前掃一下本檔，避免重工或漏掉已知問題。

---

## 資料校正（已知不正確、待修）

- [ ] **`walkthrough.json#ch11-add-lansseax`**：detail 寫「掉古龍雷電禱告」，實際掉的是**武器「蘭斯桑克斯的雷矛」**（古龍雷電「禱告」是另用古龍之心換的）。修時補 claim。來源：fextralife / 解包。
- [ ] **`walkthrough.json#ch16-s4`**：boss 名「黑暗棄子艾絲提」宜統一為官方「**亞斯特爾（Astel）**」（追憶連結 `col-rem-6` 已對到此步、命名不一致）。來源：translations-csv（npcs）。

## 功能 / 範圍

- [ ] **黃金樹幽影 DLC**：base game 資料穩定後再開（`collection.json` 已有空的 `dlc` 區佔位）。

## 雜項 / 環境

- [ ] **遠端分支 `claude/elden-ring-strategy-tool-wqmtv8` 待刪**：已併入 main 後多餘，但沙箱 git proxy 不接受刪除 push、GitHub MCP 無刪 ref 工具 → 請使用者到 GitHub 網頁 Branches 頁刪。
