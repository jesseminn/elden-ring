export type StepType = "event" | "optional" | "note";

export interface Step {
  id: string;
  chapterId: string;
  type: StepType;
  text: string;
  detail: string[];
  items: string[];
  boss: boolean;
  quests: string[];
}

export interface Chapter {
  id: string;
  num: number;
  title: string;
  nonMainline: boolean;
  level: string;
  upgrade: string;
  steps: Step[];
}

export interface Quest {
  id: string;
  name: string;
  desc: string;
  color: string;
  major: boolean;
  stepIds: string[];
  count: number;
}

export interface Walkthrough {
  chapters: Chapter[];
  quests: Quest[];
}
