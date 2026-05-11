import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import { DraftBubble } from "./DraftBubble";
import { light } from "../../theme/tokens";

const sentences = [
  { id: "a", text: "Hello.", chunkIndex: 0 },
  { id: "b", text: "World.", chunkIndex: 0 },
];

describe("DraftBubble", () => {
  it("renders each sentence as a DraftSentence row", () => {
    render(
      <DraftBubble
        sentences={sentences}
        transcribing={null}
        onEditSentence={() => {}}
        onDiscardSentence={() => {}}
        t={light}
      />,
    );
    expect(screen.getByText("Hello.")).toBeTruthy();
    expect(screen.getByText("World.")).toBeTruthy();
  });

  it("shows a transcribing indicator while later chunks decode", () => {
    render(
      <DraftBubble
        sentences={sentences}
        transcribing={{ done: 1, total: 3 }}
        onEditSentence={() => {}}
        onDiscardSentence={() => {}}
        t={light}
      />,
    );
    expect(screen.getByText(/transcribing 1\/3/i)).toBeTruthy();
  });

  it("omits the indicator when transcribing is null", () => {
    render(
      <DraftBubble
        sentences={sentences}
        transcribing={null}
        onEditSentence={() => {}}
        onDiscardSentence={() => {}}
        t={light}
      />,
    );
    expect(screen.queryByText(/transcribing/i)).toBeNull();
  });
});
