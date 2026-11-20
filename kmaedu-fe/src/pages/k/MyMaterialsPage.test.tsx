// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MyMaterialsPage from "./MyMaterialsPage";

const held = vi.hoisted(() => ({ perms: [] as string[] }));
vi.mock("@/hooks/useCan", () => ({ useCan: (p: string) => held.perms.includes(p) }));
vi.mock("./components/my-materials/my-documents-section", () => ({ MyDocumentsSection: () => <p>documents</p> }));
vi.mock("./components/my-materials/my-flashcards-section", () => ({ MyFlashcardsSection: () => <p>flashcards</p> }));
vi.mock("./components/quiz-practice/SharedQuizSection", () => ({ SharedQuizSection: () => <p>practice sets</p> }));

describe("my materials sections by permission", () => {
  it("shows a student the practice sets and flashcards, not the documents", () => {
    held.perms = ["flashcard:study", "quiz:practice"];
    render(<MyMaterialsPage />);
    expect(screen.getByText("practice sets")).toBeTruthy();
    expect(screen.getByText("flashcards")).toBeTruthy();
    expect(screen.queryByText("documents")).toBeNull();
  });

  it("hides the practice sets without quiz:practice", () => {
    held.perms = ["flashcard:study", "ai:generate"];
    render(<MyMaterialsPage />);
    expect(screen.queryByText("practice sets")).toBeNull();
    expect(screen.getByText("documents")).toBeTruthy();
  });
});
