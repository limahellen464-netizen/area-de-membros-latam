import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LessonRow } from "./LessonRow";
import type { PurchaseModule } from "./types";

const module: PurchaseModule = {
  id: "lesson-2",
  module_name: "A Química do Amor",
  completed: false,
  has_video: true,
  has_audio: false,
  has_pdf: true,
  is_published: true,
  video_url: "https://www.youtube.com/watch?v=test",
};

describe("LessonRow", () => {
  it("opens a current lesson when tapped again", () => {
    const onSelect = vi.fn();
    render(
      <LessonRow
        index={2}
        module={module}
        state="current"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /A Química do Amor/i }),
    );

    expect(onSelect).toHaveBeenCalledWith("lesson-2");
  });

  it("opens another published lesson with one tap", () => {
    const onSelect = vi.fn();
    render(
      <LessonRow
        index={2}
        module={module}
        state="next"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /A Química do Amor/i }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
