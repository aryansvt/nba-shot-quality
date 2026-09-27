// build-time imports of the exported json, typed once here
import contextJson from "@/data/context.json";
import metricsJson from "@/data/metrics.json";
import modelsJson from "@/data/models.json";
import playersJson from "@/data/players.json";
import rocJson from "@/data/roc.json";
import shapJson from "@/data/shap.json";

import type { Context, Metrics, Models, Players, Roc, Shap } from "./types";

export const metrics = metricsJson as Metrics;
export const models = modelsJson as unknown as Models;
export const roc = rocJson as Roc;
export const shap = shapJson as unknown as Shap;
export const players = playersJson as Players;
export const context = contextJson as unknown as Context;
