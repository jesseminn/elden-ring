import rawBuilds from "../data/builds.json";
import type { BuildData } from "../types";

export const buildData = rawBuilds as unknown as BuildData;
export const { statMeta, statOrder, base, baseLv, earlySegments, builds } = buildData;
