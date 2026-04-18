export interface SplitSuggestion {
  name: string;
  tagged: string;
}

export interface ISplitSuggester {
  suggest(name: string, tagged: string, difficulty: string): SplitSuggestion[];
}
