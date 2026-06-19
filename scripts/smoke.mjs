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

// 5) 配點器（頂層模式，與流程追蹤器同層）：切換後渲染，且分頁列收起
click([...$$(".mode")].find(b=>b.textContent.includes("配點"))); await wait();
console.log("5) 配點器渲染:", !!$(".build-view"), "| 分頁列收起:", $$(".tab").length === 0, "| 附近時間軸列數:", $$(".build-view .build-tl-row").length);
const lvlBtn = $$(".build-view button").find(b=>b.textContent.includes("記錄"));
click(lvlBtn); await wait();
const ui = JSON.parse(localStorage.getItem("elden-ui-v1")||"{}");
console.log("   升級後 buildLv:", ui.buildLv, "(預期 6)");

// 6) 切換 build：下拉選「龍饗」，驗證 build 切換且裝備清單更新（出現龍饗聖印）
const sel = $(".build-picker select");
console.log("   build 選項數:", sel ? sel.options.length : 0);
const dragonOpt = [...sel.options].find(o=>o.textContent.includes("龍饗"));
sel.value = dragonOpt.value;
sel.dispatchEvent(new window.Event("change", { bubbles: true })); await wait();
const ui2 = JSON.parse(localStorage.getItem("elden-ui-v1")||"{}");
const hasSeal = $$(".build-gear-name").some(n=>n.textContent.includes("龍饗聖印"));
console.log("6) 切換後 buildId:", ui2.buildId, "| 出現龍饗聖印:", hasSeal);

console.log("錯誤數:", errors.length);
errors.slice(0,4).forEach(e=>console.log("  X", e.slice(0,140)));
process.exit(errors.length?1:0);
