import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { DoneMap } from "./lib/data";

const LS_PROGRESS = "elden-progress-v1";
const LS_UI = "elden-ui-v1";

export type Tab = "flow" | "quests";

export interface Facets {
  boss: boolean;
  collect: boolean;
  npc: boolean;
}

export interface UiState {
  tab: Tab;
  collapsed: Record<string, boolean>;
  hideDone: boolean;
  onlyMain: boolean;
  activeQuest: string | null;
  facets: Facets;
}

export interface State {
  done: DoneMap;
  ui: UiState;
  // 跨頁跳轉用：要捲動並閃爍的步驟（非持久化）
  highlight: { stepId: string; nonce: number } | null;
  // 底部彈出的支線全貌（非持久化）
  peek: { qid: string; fromStepId: string } | null;
}

export type Action =
  | { type: "toggleStep"; id: string; value: boolean }
  | { type: "setProgress"; done: DoneMap }
  | { type: "resetProgress" }
  | { type: "setTab"; tab: Tab }
  | { type: "toggleChapter"; id: string }
  | { type: "setAllCollapsed"; ids: string[]; value: boolean }
  | { type: "setHideDone"; value: boolean }
  | { type: "setOnlyMain"; value: boolean }
  | { type: "toggleFacet"; facet: keyof Facets }
  | { type: "openQuest"; id: string }
  | { type: "openPeek"; qid: string; fromStepId: string }
  | { type: "closePeek" }
  | { type: "gotoStep"; chapterId: string; stepId: string }
  | { type: "clearHighlight" };

function load<T>(key: string, def: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v ?? def;
  } catch {
    return def;
  }
}

const defaultUi: UiState = {
  tab: "flow",
  collapsed: {},
  hideDone: false,
  onlyMain: false,
  activeQuest: null,
  facets: { boss: false, collect: false, npc: false },
};

export function initialState(): State {
  const savedUi = load<Partial<UiState>>(LS_UI, {});
  return {
    done: load<DoneMap>(LS_PROGRESS, {}),
    ui: { ...defaultUi, ...savedUi, facets: { ...defaultUi.facets, ...(savedUi.facets || {}) } },
    highlight: null,
    peek: null,
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggleStep": {
      const done = { ...state.done };
      if (action.value) done[action.id] = true;
      else delete done[action.id];
      return { ...state, done };
    }
    case "setProgress":
      return { ...state, done: action.done };
    case "resetProgress":
      return { ...state, done: {} };
    case "setTab":
      return { ...state, ui: { ...state.ui, tab: action.tab } };
    case "toggleChapter":
      return {
        ...state,
        ui: {
          ...state.ui,
          collapsed: { ...state.ui.collapsed, [action.id]: !state.ui.collapsed[action.id] },
        },
      };
    case "setAllCollapsed": {
      const collapsed = { ...state.ui.collapsed };
      for (const id of action.ids) collapsed[id] = action.value;
      return { ...state, ui: { ...state.ui, collapsed } };
    }
    case "setHideDone":
      return { ...state, ui: { ...state.ui, hideDone: action.value } };
    case "setOnlyMain":
      return { ...state, ui: { ...state.ui, onlyMain: action.value } };
    case "toggleFacet":
      return {
        ...state,
        ui: { ...state.ui, facets: { ...state.ui.facets, [action.facet]: !state.ui.facets[action.facet] } },
      };
    case "openQuest":
      return { ...state, ui: { ...state.ui, tab: "quests", activeQuest: action.id } };
    case "openPeek":
      return { ...state, peek: { qid: action.qid, fromStepId: action.fromStepId } };
    case "closePeek":
      return { ...state, peek: null };
    case "gotoStep":
      return {
        ...state,
        peek: null,
        ui: {
          ...state.ui,
          tab: "flow",
          collapsed: { ...state.ui.collapsed, [action.chapterId]: false },
        },
        highlight: { stepId: action.stepId, nonce: Date.now() },
      };
    case "clearHighlight":
      return { ...state, highlight: null };
    default:
      return state;
  }
}

// 拆成兩個 context：state 會變動，dispatch 永遠穩定，
// 讓只依賴 dispatch 的元件（如 memo 化的步驟列）不會被無謂重繪。
const StateCtx = createContext<State | null>(null);
const DispatchCtx = createContext<Dispatch<Action> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    localStorage.setItem(LS_PROGRESS, JSON.stringify(state.done));
  }, [state.done]);

  useEffect(() => {
    localStorage.setItem(LS_UI, JSON.stringify(state.ui));
  }, [state.ui]);

  return (
    <DispatchCtx.Provider value={dispatch}>
      <StateCtx.Provider value={state}>{children}</StateCtx.Provider>
    </DispatchCtx.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useAppState 必須在 StoreProvider 內使用");
  return ctx;
}

export function useDispatch() {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error("useDispatch 必須在 StoreProvider 內使用");
  return ctx;
}
