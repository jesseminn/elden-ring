#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「個人筆記式攻略」純文字檔解析成結構化資料 (public/data.js)。

來源 PDF 由 pdftotext 取出，內含「康熙部首 / CJK 部首補充」字元
(例如 ⼭⼈⼤⽔ 其實是 U+2F00 區段)，會破壞中文關鍵字比對，
因此先用 unicodedata.normalize('NFKC') 還原成正常漢字。

輸出資料模型：
  chapters: [{ id, num, title, region, level, upgrade, mainline, steps:[Step] }]
  quests:   [{ id, name, npc, color, desc, stepIds:[...] }]

Step:
  { id, chapterId, type:'event'|'optional', text, detail:[..], items:[..],
    boss: bool, quests:[questId,..] }
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "main-guide.txt"
OUT_JSON = ROOT / "src" / "data" / "walkthrough.json"

# ---------------------------------------------------------------------------
# 支線定義：NPC 名稱 + 別名（用來把散落的步驟聚合成一條支線）
# order 影響支線清單顯示順序；major 表示主要長支線。
# ---------------------------------------------------------------------------
QUESTS = [
    ("ranni",     "菈妮", "暗月女王 菈妮的支線（星之世紀結局關鍵）", "#7c6cff", True,
     ["菈妮"]),
    ("blaidd",    "布萊澤", "半狼人布萊澤，菈妮的忠僕", "#5b8def", True,
     ["布萊澤"]),
    ("iji",       "鐵匠伊吉", "卡利亞的鐵匠巨人，布萊澤的同伴", "#6aa1c4", False,
     ["伊吉"]),
    ("seluvis",   "賽爾維斯", "魔法師賽爾維斯的傀儡支線", "#9b6cff", True,
     ["賽爾維斯", "塞爾維斯"]),
    ("ranni_sister", "嬌小菈妮 / 娃娃", "菈妮本體（娃娃）後半段", "#8d7bff", False,
     ["嬌小菈妮", "撿起娃娃"]),
    ("nepheli",   "涅斐麗", "涅斐麗‧露的支線", "#e0a458", True,
     ["涅斐麗"]),
    ("gideon",    "百智基甸", "全知者基甸爵士", "#c9a24a", False,
     ["基甸", "百智"]),
    ("roderika",  "羅德莉卡", "調靈師羅德莉卡", "#d98ca0", False,
     ["羅德莉卡", "蛹群"]),
    ("alexander", "戰士壺 亞歷山大", "鐵拳亞歷山大的旅程", "#d2691e", True,
     ["亞歷山大"]),
    ("patches",   "帕奇", "永遠的反派帕奇", "#7aa05a", True,
     ["帕奇"]),
    ("yura",      "尤拉", "獵指人尤拉", "#c0392b", True,
     ["尤拉"]),
    ("d",         "獵死者 D", "獵死者 D 與其弟", "#888fa0", True,
     ["獵死者", "D的弟弟", "D對話", "跟D", "與D", "找D", "給D的弟弟", "給D"]),
    ("fia",       "死眠少女 菲雅", "死眠少女菲雅的支線", "#7d8fb3", True,
     ["菲雅", "死眠少女", "死王子寶座"]),
    ("millicent", "米莉森", "米莉森的猩紅腐敗支線", "#e05a7a", True,
     ["米莉森"]),
    ("gowry",     "賢者格威", "瑟莉亞的賢者格威", "#b08968", False,
     ["格威"]),
    ("dungeater", "食糞者", "食糞者的詛咒支線", "#6b8e23", True,
     ["食糞者"]),
    ("corhyn",    "僧侶柯林", "黃金律法僧侶柯林", "#caa94a", True,
     ["柯林"]),
    ("goldmask",  "金面具", "黃金律法學者金面具", "#d4af37", False,
     ["金面具"]),
    ("sellen",    "魔法師 瑟濂", "賢者瑟濂的支線", "#5fa8a0", True,
     ["瑟濂"]),
    ("hyetta",    "盲眼少女 海妲", "盲眼少女海妲（癲火）", "#b5651d", True,
     ["海妲"]),
    ("boc",       "裁縫師 柏克", "亞人裁縫師柏克", "#7fb069", False,
     ["柏克"]),
    ("kenneth",   "肯尼斯", "肯尼斯‧海特的奪城支線", "#a0855b", False,
     ["肯尼斯"]),
    ("diallos",   "狄亞羅斯", "霍斯拉家的狄亞羅斯", "#8b95a8", False,
     ["狄亞羅斯"]),
    ("rya",       "菈雅", "蛇人菈雅（火山官邸）", "#cf6679", True,
     ["菈雅"]),
    ("tanith",    "火山官邸 塔妮絲", "火山官邸與暗殺任務", "#c0392b", True,
     ["塔妮絲", "火山官邸", "暗殺任務"]),
    ("latenna",   "白金之子 勒緹娜", "白金村的勒緹娜", "#9ab973", False,
     ["勒緹娜", "白金村"]),
    ("thops",     "魔法師 托普斯", "渴望入學的托普斯", "#5f9ea0", False,
     ["托普斯"]),
    ("varre",     "白面具 梵雷", "白面具梵雷（血指）", "#a83232", True,
     ["梵雷"]),
    ("gostoc",    "門衛 葛托克", "史東薇爾門衛葛托克", "#8a7f6a", False,
     ["葛托克"]),
    ("rogier",    "魔法師 羅傑爾", "騎士羅傑爾", "#6c8cbf", False,
     ["羅傑爾"]),
    ("jarbairn",  "小壺", "壺村的小壺（亞歷山大繼承者）", "#cd853f", False,
     ["小壺"]),
    ("gurranq",   "野獸祭司（死根）", "野獸祭司死根收集（9 個）", "#555b66", False,
     ["野獸祭司", "死根"]),
    ("melina",    "梅琳娜", "引導者梅琳娜（賜福對話）", "#b08ea2", False,
     ["梅琳娜"]),
]

# ---------------------------------------------------------------------------
# Boss 名單（用於標示 Boss 戰）
# ---------------------------------------------------------------------------
BOSSES = [
    "瑪爾基特", "惡兆王蒙葛特", "蒙葛特", "接肢", "葛瑞克", "滿月女王", "蕾娜菈",
    "拉達岡的紅狼", "紅狼", "碎星", "拉塔恩", "女武神", "瑪蓮妮亞", "黑劍",
    "瑪利喀斯", "初始之王", "葛孚雷", "鮮血君王", "蒙格", "褻瀆君王", "拉卡德",
    "火焰巨人", "墜星成獸", "神皮使徒", "黑暗棄子", "艾絲提", "死龍", "弗爾桑克斯",
    "FINAL BOSS", "荷萊", "老將尼奧", "老將歐尼爾", "龍王", "普拉契頓桑克斯",
    "獅子混種", "獅子混種", "飛龍亞基爾", "祖靈", "祖靈之王", "亞人女王", "瑪姬",
    "聖樹騎士", "羅蕾塔", "紅狼", "惡兆之子", "蛇半神", "蛇王",
]

ITEM_TRIGGER = re.compile(r"(取得|獲得|拿到|拾取|拿取|購入|撿取|撿到|學會|學魔法|可得|得到)")
BRACKET = re.compile(r"「([^」]+)」")


def _need_nfkc(ch: str) -> bool:
    """只針對會破壞比對的相容字做正規化，保留官方全形標點。"""
    o = ord(ch)
    return (
        0x2E80 <= o <= 0x2EFF  # CJK 部首補充
        or 0x2F00 <= o <= 0x2FDF  # 康熙部首
        or 0xF900 <= o <= 0xFAFF  # CJK 相容表意文字
        or 0x3300 <= o <= 0x33FF  # CJK 相容符號
    )


# 少數部首字無 NFKC 分解，手動對應
MANUAL_MAP = {
    "⻄": "西",  # ⻄
    "⺠": "民",  # ⺠
}


def norm(s: str) -> str:
    """逐字正規化：把康熙部首/相容字還原成正常漢字，但保留全形標點（，：（）等）。"""
    out = []
    for ch in s:
        if ch in MANUAL_MAP:
            out.append(MANUAL_MAP[ch])
        elif _need_nfkc(ch):
            out.append(unicodedata.normalize("NFKC", ch))
        else:
            out.append(ch)
    return "".join(out)


def extract_items(segments):
    """從文字段落抓出收集品（出現在『取得/獲得...』語境內的 「...」）。"""
    items = []
    for seg in segments:
        # 只在含有取得類動詞的段落抓括號內容，避免抓到動作 / 對話名
        if ITEM_TRIGGER.search(seg):
            for m in BRACKET.finditer(seg):
                inner = m.group(1)
                # 以、分隔多個道具
                for part in re.split(r"[、，]", inner):
                    part = part.strip()
                    # 去掉括號內的條件說明
                    part = re.sub(r"[（(].*?[)）]", "", part).strip()
                    if part and part not in items and len(part) <= 30:
                        items.append(part)
    return items


def detect_boss(text):
    return any(b in text for b in BOSSES) or "BOSS" in text


def detect_quests(text):
    found = []
    for qid, name, npc, color, major, aliases in QUESTS:
        if any(a in text for a in aliases):
            found.append(qid)
    return found


def main():
    raw = SRC.read_text(encoding="utf-8")
    raw = norm(raw)
    lines = raw.split("\n")

    chapters = []
    cur_chapter = None
    cur_step = None
    started = False

    chapter_re = re.compile(r"^(\d{1,2})\.\s*([^\n、]+?)、\s*(.*)$")
    level_re = re.compile(r"建議等級([^，,]+)[，,]\s*武器強化([^)）]+)")

    def push_step():
        nonlocal cur_step
        if cur_step and cur_chapter is not None:
            cur_chapter["steps"].append(cur_step)
        cur_step = None

    for rawline in lines:
        line = rawline.rstrip()
        stripped = line.strip()
        if not stripped:
            continue

        # 結束：參考資料之後不再解析
        if stripped.startswith("參考資料"):
            break

        m = chapter_re.match(stripped)
        if m and (("建議等級" in stripped) or ("非主線" in stripped) or
                  (cur_chapter is not None) or stripped.startswith(("1.", "2.", "3.", "4.", "5."))):
            # 章節標題
            num = int(m.group(1))
            title = m.group(2).strip()
            rest = m.group(3).strip()
            mainline = "非主線" not in title and "非主線" not in rest
            title_clean = title.replace("非主線地圖：", "")
            level = upgrade = ""
            lm = level_re.search(rest)
            if lm:
                level = lm.group(1).strip()
                upgrade = lm.group(2).strip()
            push_step()
            cur_chapter = {
                "id": f"ch{num}",
                "num": num,
                "title": title_clean,
                "nonMainline": "非主線" in title or "非主線" in rest,
                "level": level,
                "upgrade": upgrade,
                "steps": [],
            }
            chapters.append(cur_chapter)
            started = True
            continue

        if not started:
            continue  # 略過前言

        first = stripped[0]
        if first in ("●", "▲"):
            push_step()
            text = stripped[1:].strip()
            cur_step = {
                "id": "",
                "type": "event" if first == "●" else "optional",
                "text": text,
                "detail": [],
                "_lt": "text",  # 上一段落寫到哪：text / detail
            }
        elif first in ("※", "*", "→"):
            # 註解 / 條件 / 分支：附加到目前步驟
            note = stripped
            if cur_step is not None:
                cur_step["detail"].append(note)
                cur_step["_lt"] = "detail"
            elif cur_chapter is not None:
                # 章節開頭的提示，建立一個 note-only 步驟
                cur_step = {"id": "", "type": "note", "text": note.lstrip("※*→ "),
                            "detail": [], "_lt": "text"}
        else:
            # 續行：可能是換行的句子，或縮排的「取得...」道具行
            if cur_step is None:
                continue
            if stripped.startswith("取得") or stripped.startswith("「") or ITEM_TRIGGER.match(stripped):
                cur_step["detail"].append(stripped)
                cur_step["_lt"] = "detail"
            elif cur_step["_lt"] == "detail" and cur_step["detail"]:
                # 折行：接續到上一條 detail（道具/分支），而非主文字
                cur_step["detail"][-1] = (cur_step["detail"][-1] + stripped).strip()
            else:
                # 視為換行接續，併入上一段文字
                cur_step["text"] = (cur_step["text"] + stripped).strip()

    push_step()

    # 後處理：編號、抓道具、Boss、支線、組裝 quest.stepIds
    quest_steps = {q[0]: [] for q in QUESTS}
    for ch in chapters:
        for i, st in enumerate(ch["steps"], 1):
            st["id"] = f"{ch['id']}-s{i}"
            st["chapterId"] = ch["id"]
            segments = [st["text"]] + st["detail"]
            joined = " ".join(segments)
            st["items"] = extract_items(segments)
            # Boss 旗標只看主文字，避免被 detail 內分支提及誤判
            st["boss"] = detect_boss(st["text"]) if st["type"] != "note" else False
            st["quests"] = detect_quests(joined) if st["type"] != "note" else []
            st.pop("_lt", None)
            for qid in st["quests"]:
                quest_steps[qid].append(st["id"])

    quests_out = []
    for qid, name, npc, color, major, aliases in QUESTS:
        quests_out.append({
            "id": qid,
            "name": name,
            "desc": npc,
            "color": color,
            "major": major,
            "stepIds": quest_steps[qid],
            "count": len(quest_steps[qid]),
        })

    data = {"chapters": chapters, "quests": quests_out}

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    n_steps = sum(len(c["steps"]) for c in chapters)
    print(f"章節 {len(chapters)}，步驟 {n_steps}")
    print("支線步驟統計：")
    for q in quests_out:
        print(f"  {q['name']:<14} {q['count']:>3}")


if __name__ == "__main__":
    main()
