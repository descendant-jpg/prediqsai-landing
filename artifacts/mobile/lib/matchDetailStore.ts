import type { Prediction } from "@/types";

interface MatchDetailState {
  prediction: Prediction | null;
  soccerFixtureId?: number;
}

let state: MatchDetailState = { prediction: null };

export const matchDetailStore = {
  set(prediction: Prediction, soccerFixtureId?: number) {
    state = { prediction, soccerFixtureId };
  },
  get(): MatchDetailState {
    return state;
  },
};
