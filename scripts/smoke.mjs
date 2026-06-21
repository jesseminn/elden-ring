import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: "http://localhost/", pretendToBeVisual: true });
const { window } = dom;
Object.assign(global, { window, document: window.document, HTMLElement: window.HTMLElement });
global.localStorage = window.localStorage;
global.MutationObserver = window.MutationObserver;
global.fetch = () => Promise.resolve({ ok: true });
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = () => {};
global.getComputedStyle = window.getComputedStyle.bind(window);
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.confirm = () => true;
const errors = [];
console.error = (...a) => errors.push(a.map(String).join(" "));
const wait = (ms=120) => new Promise(r=>setTimeout(r,ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent("click",{bubbles:true}));

const jsFile = fs.readdirSync(path.join(ROOT,"dist/assets")).find(f=>f.startsWith("index-")&&f.endsWith(".js"));
await import("file://"+path.resolve(ROOT,"dist/assets",jsFile));
await wait(300);
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

// 1) 勾選第一個步驟
const firstCb = $(".step:not(.note) input[type=checkbox]");
firstCb.click(); await wait();
const prog = JSON.parse(localStorage.getItem("elden-progress-v1")||"{}");
console.log("1) 勾選後 localStorage 進度筆數:", Object.keys(prog).length);
console.log("   overall 文字:", $(".overall-text").textContent.trim());

// 2) 點一個支線標籤
const chip = $(".chip.quest");
console.log("2) 點擊支線標籤:", chip.textContent.trim());
click(chip); await wait();
console.log("   目前分頁是支線:", $(".tab.active").textContent.includes("支線"));
console.log("   支線詳情標題:", $(".qd-title")?.textContent.trim());
console.log("   有下一步區塊:", !!$(".qd-next"));
console.log("   時間軸步驟數:", $$(".tl-step").length);
console.log("   下一步標記(current):", $$(".tl-step.current").length);

// 3) 從時間軸點「第N章 ›」跳回流程
const loc = $(".tl-loc");
click(loc); await wait();
console.log("3) 跳轉後分頁是流程:", $(".tab.active").textContent.includes("流程"));

// 4) 切回支線，勾選時間軸內步驟，驗證下一步前進
click([...$$(".tab")].find(t=>t.textContent.includes("支線"))); await wait();
const before = $(".qd-next .txt")?.textContent;
const tlcb = $(".tl-step input[type=checkbox]:not(:checked)");
if (tlcb){ tlcb.click(); await wait(); }
const after = $(".qd-next .txt")?.textContent;
console.log("4) 勾選後下一步有變化:", before !== after, "| 新下一步:", (after||"").slice(0,20));

// 5) 配點器：兩個自訂下拉(bottom sheet)＋ 主角=逐級追蹤常駐；詳情預設收合
click([...$$(".mode")].find(b=>b.textContent.includes("配點"))); await wait();
const triggers = ()=>$$(".mb-pickers .ss-trigger");
const openTrig = async (i)=>{ click(triggers()[i]); await wait(); };
const pickOpt = async (text)=>{ const o=$$(".sheet .ss-option").find(x=>x.textContent.includes(text)); click(o); await wait(); };
console.log("5) 配點器渲染:", !!$(".build-view"), "| 分頁列收起:", $$(".tab").length === 0, "| 自訂下拉數:", triggers().length, "| 詳情預設收合:", $(".mb-verdict")==null, "| 逐級追蹤常駐:", $$(".build-view button").some(b=>b.textContent.includes("記錄")));

// 5a) 開職業 bottom sheet，確認彈出與選項數，選回盜賊
await openTrig(0);
console.log("   職業 sheet 開啟:", !!$(".sheet"), "| 職業選項:", $$(".sheet .ss-option").length);
await pickOpt("盜賊");
console.log("   選後 sheet 關閉:", $(".sheet")==null);

// 5b) 點「詳情」展開浪費分析卡（預設盜賊×出血流應 perfect）
click($$(".build-view button").find(b=>b.textContent.includes("詳情"))); await wait();
console.log("   點詳情後(盜賊×出血流):", $(".mb-verdict")?.classList.contains("perfect"), "|", $(".mb-verdict-waste")?.textContent.trim());

// 6) 換職業=星見、流派=純智力 → 應零浪費；再換純信仰 → 浪費變大（詳情已開）
await openTrig(0); await pickOpt("星見");
await openTrig(1); await pickOpt("純智力");
console.log("6) 星見×純智力:", $(".mb-verdict-waste")?.textContent.trim(), "| perfect:", $(".mb-verdict.perfect")!=null);
await openTrig(1); await pickOpt("純信仰");
console.log("   星見×純信仰:", $(".mb-verdict-waste")?.textContent.trim());

// 7) 回盜賊×龍饗：逐級追蹤裝備出現龍饗印記，升級 +1
await openTrig(0); await pickOpt("盜賊");
await openTrig(1); await pickOpt("龍饗");
const hasSeal = $$(".build-gear-name").some(n=>n.textContent.includes("龍饗印記"));
const lvlBtn = $$(".build-view button").find(b=>b.textContent.includes("記錄"));
if (lvlBtn){ click(lvlBtn); await wait(); }
const ui = JSON.parse(localStorage.getItem("elden-ui-v1")||"{}");
console.log("7) 出現龍饗印記:", hasSeal, "| 升級後 buildLv:", ui.buildLv, "(預期 6)");

console.log("錯誤數:", errors.length);
errors.slice(0,4).forEach(e=>console.log("  X", e.slice(0,140)));
process.exit(errors.length?1:0);
