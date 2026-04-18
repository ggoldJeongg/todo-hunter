import { EndingState, type DialogueLine } from "@/constants";

export interface EndingDTO {
  endingState: EndingState;
  endingCode: string;
  endingName: string;
  endingStory: string[];
  endingDialogue: DialogueLine[];
  endingImage: string;
  achievableTitle: {
    titleName: string;
    description: string;
  };
}
