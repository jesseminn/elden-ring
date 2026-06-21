# 中英翻譯資料（Elden Ring 官方繁中 ↔ English）

把可查詢的中英名稱對照**資料**收進 repo，供配點器/流程追蹤器查證專名時直接比對。
資料為 `zh,en` 兩欄 CSV（含逗號的欄位以雙引號包住），方便 `grep`／`jq`／試算表開啟。

## 來源（最權威：遊戲內官方文本）

取自遊戲解包文本 **[`github.com/elden-ring-data/msg`](https://github.com/elden-ring-data/msg)**：
- `engus/item.msgbnd.dcx.json` = 遊戲官方**英文**
- `zhotw/item.msgbnd.dcx.json` = 遊戲官方**正體中文**（即遊戲內繁中）

以 FMG 條目 **id 對齊** en↔zhotw 產生。這是遊戲本身的官方繁中，**比 feiouex/wiki 更權威**
（例：官方為「腐**敗**吐息」非攻略常見的「腐爛吐息」；「褻瀆聖劍」「屍山血海」「彗星亞茲勒」均一致）。

## 資料檔

| 檔案 | FMG 來源 | 內容 | 筆數 |
|---|---|---|--|
| `weapons.csv` | WeaponName | 武器（全武裝基礎名，標準派生 id%10000==0） | 445 |
| `armor.csv` | ProtectorName | 防具 | 577 |
| `talismans.csv` | AccessoryName | 護符（去 +N 強化變體） | 93 |
| `sorceries.csv` | GoodsName 4000–5999 | 魔法/法術 | 70 |
| `incantations.csv` | GoodsName 6000–7999 | 禱告 | 101 |
| `spirit-ashes.csv` | GoodsName 200000+ | 骨灰（去 +N） | 64 |
| `ashes-of-war.csv` | ArtsName | 戰技/戰灰 | 177 |
| `npcs.csv` | NpcName | NPC / Boss / 生物 | 255 |
| `places.csv` | PlaceName | 地名 / 賜福點 | 437 |

> 武器只收標準派生的基礎名（不列 Heavy/Keen… 派生與 +N 強化），避免上千筆重複。

## 查詢範例

```bash
grep -i "blasphemous" docs/translations/weapons.csv      # 英 → 中：褻瀆聖劍
grep "屍山血海" docs/translations/weapons.csv            # 中 → 英：Rivers of Blood
grep -i "rotten breath" docs/translations/incantations.csv
grep -i "malenia" docs/translations/npcs.csv             # Boss/NPC
grep "史東薇爾" docs/translations/places.csv             # 地名
```

## 更新方法

```bash
for L in engus zhotw; do
  curl -sSL "https://raw.githubusercontent.com/elden-ring-data/msg/main/$L/item.msgbnd.dcx.json" -o /tmp/item_$L.json
done
# 結構：{ "...\\XxxName.fmg": { "id": "文字" } }；以 id 對齊 en↔zhotw，
# 去 <tag>/%null%/[ERROR]/test/+N，weapons 取 id%10000==0。腳本見 git 歷史。
```

DLC 名稱若要補：本 repo 的 item.msgbnd 為本體；DLC 文本見上游 repo 對應檔或 Carian/Impalers Archive。

## 取得繁中名的來源備忘（吃過虧）

- **首選**：上述 GitHub 官方文本 dump（github.com，curl raw 直接可得）。
- 巴哈 `home.gamer.com.tw`（feiouex 各篇一覽）：**WebFetch 會 403，Bash `curl` 可得 200**。
- `wiki.biligame.com`：本 session 實測 **curl 200**（與舊註記相反），但其列表頁多為簡中且少英文。
- 判別真被 egress 擋：`curl` 回 `Host not in allowlist`。**英文搜尋摘要的音譯不可信。**

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

> 等級 = 八維總和 − 79（已用官方數值驗證）。
