import { render, screen, fireEvent } from "@testing-library/preact";
import { Thread } from "./Thread";
import { light } from "../../theme/tokens";
import type { Message } from "../../types";

const messages: Message[] = [
  { from: "patient", text: "I need water", time: "2:30 PM", label: "Maria" },
  { from: "provider", text: "I will get that for you.", time: "2:31 PM", label: "Dr. Smith" },
];

// jsdom doesn't implement scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("Thread", () => {
  it("returns null when messages array is empty", () => {
    const { container } = render(
      <Thread messages={[]} t={light} onRepeat={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows the 'tap to say again' header", () => {
    render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
    expect(
      screen.getByText(/tap to say again/i),
    ).toBeInTheDocument();
  });

  it("renders message text for each message", () => {
    render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
    expect(screen.getByText("I need water")).toBeInTheDocument();
    expect(screen.getByText("I will get that for you.")).toBeInTheDocument();
  });

  it("renders speaker labels and times", () => {
    render(<Thread messages={messages} t={light} onRepeat={vi.fn()} />);
    expect(screen.getByText(/Maria/)).toBeInTheDocument();
    expect(screen.getByText(/2:30 PM/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Smith/)).toBeInTheDocument();
    expect(screen.getByText(/2:31 PM/)).toBeInTheDocument();
  });

  it("calls onRepeat with text and from when a bubble is tapped", () => {
    const onRepeat = vi.fn();
    render(<Thread messages={messages} t={light} onRepeat={onRepeat} />);
    fireEvent.click(screen.getByRole("button", { name: /Repeat: I need water/ }));
    expect(onRepeat).toHaveBeenCalledWith("I need water", "patient");
  });

  it("calls onRepeat with provider info when a provider bubble is tapped", () => {
    const onRepeat = vi.fn();
    render(<Thread messages={messages} t={light} onRepeat={onRepeat} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Repeat: I will get that for you/ }),
    );
    expect(onRepeat).toHaveBeenCalledWith("I will get that for you.", "provider");
  });

  it("single message renders correctly", () => {
    render(
      <Thread
        messages={[messages[0]]}
        t={light}
        onRepeat={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("I need water")).toBeInTheDocument();
  });
});
