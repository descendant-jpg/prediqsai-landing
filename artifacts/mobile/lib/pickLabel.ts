/** Convert a raw prediction value (e.g. "home_win") into display copy. */
export function pickLabel(prediction: string, homeTeam: string, awayTeam: string): string {
  switch (prediction) {
    case "home_win": return `${homeTeam} to Win`;
    case "away_win": return `${awayTeam} to Win`;
    case "draw": return "Draw";
    case "over": return "Over 2.5 Goals";
    case "under": return "Under 2.5 Goals";
    default: return prediction;
  }
}
