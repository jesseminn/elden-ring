# 中英翻譯資料（Elden Ring 官方繁中 ↔ English）

把可查詢的中英名稱對照**資料**收進 repo，供配點器/流程追蹤器查證專名時直接比對。
資料為 `zh,en` 兩欄 CSV，方便 `grep`／`jq`／試算表開啟。

## 資料檔

| 檔案 | 內容 | 筆數 | 來源 |
|---|---|--|---|
| `weapons.csv` | 本體武器中英對照 | 306 | feiouex《本體武器一覽》sn=5416196 |
| `talismans.csv` | 本體護符中英對照 | 91 | feiouex《本體護符一覽》sn=5405697 |

> 權威來源為原攻略作者 **feiouex（巴哈姆特）**，與流程追蹤器同源；名稱即官方繁中。

## 查詢範例

```bash
grep -i "blasphemous" docs/translations/weapons.csv      # 英文 → 中文
grep "屍山血海" docs/translations/weapons.csv            # 中文 → 英文
awk -F, 'NR>1{print $2}' docs/translations/weapons.csv   # 列出所有英文名
```

## 取得 / 更新方法（吃過虧，務必照做）

巴哈 `home.gamer.com.tw` **WebFetch 會回 403**（擋 User-Agent），但 **Bash `curl` 抓得到（200）**：

```bash
curl -sS "https://home.gamer.com.tw/artwork.php?sn=5416196" -o /tmp/w.html
# 表格為「序號→中文→英文→說明」，去標籤後取相鄰「中文行 / 英文行」配對；
# 注意把 \xa0(不斷行空白) 正規化成空白，否則多字英文名(如 Crimson Amber Medallion)會被截斷。
```

判別「真被 egress 擋」vs「只是 UA」：`curl` 回 `Host not in allowlist` = 真被擋
（`wiki.biligame.com`、`*.github.io`、`b23.tv→bilibili` 風控頁屬此類）；回 200 = 只是 UA 問題。
**英文搜尋摘要的音譯不可信，一律以 feiouex 一覽為準。**

## 尚未收錄（目前來源不可用）

- **Boss/生物名**：feiouex 追憶 BOSS 頁(sn=5413336)是 HP/圖文、無乾淨中英表；
  bilibili 生物對照表為簡中、且被風控驗證碼擋死。**暫無可靠繁中來源**。
- **地名/賜福點**：zoncheng 賜福點頁的中英清單未隨 HTML 回傳（延遲載入）。
- 流程追蹤器內的地名/Boss 名本就取自 feiouex 主攻略原文，已是官方繁中。
- 其他類別（法術/禱告、骨灰、戰技…）可用上述方法從 feiouex 對應一覽補進來。

## feiouex 各篇一覽（巴哈 sn）

| 主題 | URL |
|---|---|
| 本體武器一覽 | https://home.gamer.com.tw/artwork.php?sn=5416196 |
| 本體護符一覽 | https://home.gamer.com.tw/artwork.php?sn=5405697 |
| 個人筆記式攻略（主攻略） | https://home.gamer.com.tw/artwork.php?sn=5419567 |
| 多周目「追憶」BOSS 資料 | https://home.gamer.com.tw/artwork.php?sn=5413336 |
| 初始職業介紹 / 適合屬性 | sn=5389611 / sn=5387926 |
| 感應軟硬上限 / 力量效益點法 | sn=5405089 / sn=5373322 |

## 屬性與職業（配點器用，官方繁中）

屬性：生命力 VIG / 集中力 MND / 耐力 END / 力氣 STR / 靈巧 DEX / 智力 INT / 信仰 FAI / **感應 ARC**

| 職業 EN | 繁中 | Lv | 生 集 耐 力 敏 智 信 感 |
|---|---|--|---|
| Vagabond | 流浪騎士 | 9 | 15 10 11 14 13 9 9 7 |
| Samurai | 武士 | 9 | 12 11 13 12 15 9 8 8 |
| Hero | 勇者 | 7 | 14 9 12 16 9 7 8 11 |
| Bandit | 盜賊 | 5 | 10 11 10 9 13 9 8 14 |
| Astrologer | 星見 | 6 | 9 15 9 8 12 16 7 9 |
| Warrior | 戰士 | 8 | 11 12 11 10 16 10 8 9 |
| Prisoner | 囚犯 | 9 | 11 12 11 11 14 14 6 9 |
| Confessor | 告解者 | 10 | 10 13 10 12 12 9 14 9 |
| Prophet | 預言者 | 7 | 10 14 8 11 10 7 16 10 |
| Wretch | 無賴 | 1 | 10 10 10 10 10 10 10 10 |

> 等級 = 八維總和 − 79（已用 Fextralife 數值驗證）。
