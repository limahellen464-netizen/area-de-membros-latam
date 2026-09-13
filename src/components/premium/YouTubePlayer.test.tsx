import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getYouTubeVideoId } from "@/lib/youtubeVideo";
import { YouTubePlayer } from "./YouTubePlayer";

describe("getYouTubeVideoId", () => {
  it.each([
    ["https://youtu.be/FCYJzFukO8I", "FCYJzFukO8I"],
    ["https://www.youtube.com/watch?v=FCYJzFukO8I", "FCYJzFukO8I"],
    ["https://youtube.com/shorts/FCYJzFukO8I", "FCYJzFukO8I"],
    ["https://www.youtube.com/embed/FCYJzFukO8I", "FCYJzFukO8I"],
    ["https://www.youtube-nocookie.com/embed/FCYJzFukO8I", "FCYJzFukO8I"],
  ])("extracts the video id from %s", (url, expected) => {
    expect(getYouTubeVideoId(url)).toBe(expected);
  });

  it("rejects invalid and unrelated URLs", () => {
    expect(getYouTubeVideoId("")).toBeNull();
    expect(getYouTubeVideoId("not-a-url")).toBeNull();
    expect(getYouTubeVideoId("https://example.com/watch?v=test")).toBeNull();
  });
});

describe("YouTubePlayer", () => {
  it("renders a touch-friendly poster before loading the external player", () => {
    render(
      <YouTubePlayer
        url="https://youtu.be/FCYJzFukO8I"
        title="Boas-vindas"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Assistir aula: Boas-vindas" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("iframe")).not.toBeInTheDocument();
  });

  it("shows a clear error for an invalid video URL", () => {
    render(<YouTubePlayer url="https://example.com/video" title="Aula" />);

    expect(
      screen.getByText("Não foi possível identificar o vídeo desta aula."),
    ).toBeInTheDocument();
  });
});
