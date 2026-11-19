// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AssignLabelPicker } from "./assign-label-picker";

const labels = [
  { id: "l1", name: "Ngữ pháp", color: "#EF4444" },
  { id: "l2", name: "Từ vựng", color: null },
];

function setup(props: Partial<Parameters<typeof AssignLabelPicker>[0]> = {}) {
  const onAssign = vi.fn(async (_id: string) => true);
  const onCreate = vi.fn(async (_name: string) => true);
  const user = userEvent.setup();
  render(<AssignLabelPicker labels={labels} noun="nhãn" onAssign={onAssign} onCreate={onCreate} {...props} />);
  const open = () => user.click(screen.getByRole("button", { name: "Gán nhãn" }));
  const box = () => screen.getByRole("textbox", { name: "Tìm hoặc tạo nhãn" });
  return { user, onAssign, onCreate, open, box };
}

describe("assign label picker", () => {
  it("opens the set's labels with the search box focused", async () => {
    const { open, box } = setup();
    await open();
    expect(screen.getByRole("button", { name: "Ngữ pháp" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Từ vựng" })).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(box()));
  });

  it("filters the labels by the typed words, accents ignored", async () => {
    const { user, open, box } = setup();
    await open();
    await user.type(box(), "tu vung");
    expect(screen.queryByRole("button", { name: "Ngữ pháp" })).toBeNull();
    expect(screen.getByRole("button", { name: "Từ vựng" })).toBeTruthy();
  });

  it("assigns a clicked label and closes", async () => {
    const { user, onAssign, open } = setup();
    await open();
    await user.click(screen.getByRole("button", { name: "Từ vựng" }));
    expect(onAssign).toHaveBeenCalledWith("l2");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Tìm hoặc tạo nhãn" })).toBeNull());
  });

  it("enter on a name the set already has assigns that label instead of creating a copy", async () => {
    const { user, onAssign, onCreate, open, box } = setup();
    await open();
    await user.type(box(), "ngữ PHÁP{Enter}");
    expect(onAssign).toHaveBeenCalledWith("l1");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("enter on a new name creates it, without the outer spaces", async () => {
    const { user, onCreate, open, box } = setup();
    await open();
    await user.type(box(), "  Đại số {Enter}");
    expect(onCreate).toHaveBeenCalledWith("Đại số");
  });

  it("offers to create a new name, but not a name the set has", async () => {
    const { user, open, box } = setup();
    await open();
    await user.type(box(), "Đại số");
    expect(screen.getByRole("button", { name: /Tạo nhãn “Đại số”/ })).toBeTruthy();
    await user.clear(box());
    await user.type(box(), "từ vựng");
    expect(screen.queryByRole("button", { name: /Tạo nhãn/ })).toBeNull();
  });

  it("ignores the Enter that ends a Vietnamese IME composition", async () => {
    const { user, onAssign, onCreate, open, box } = setup();
    await open();
    await user.type(box(), "Đại số");
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(onAssign).not.toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("stays open with the typed name when the save failed", async () => {
    const onCreate = vi.fn(async () => false);
    const { user, open, box } = setup({ onCreate });
    await open();
    await user.type(box(), "Đại số{Enter}");
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect((box() as HTMLInputElement).value).toBe("Đại số");
  });

  it("does not take a second Enter while the first save runs", async () => {
    let finish!: (ok: boolean) => void;
    const onCreate = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
    const { user, open, box } = setup({ onCreate });
    await open();
    await user.type(box(), "Đại số{Enter}{Enter}");
    expect(onCreate).toHaveBeenCalledTimes(1);
    finish(true);
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Tìm hoặc tạo nhãn" })).toBeNull());
  });

  it("escape closes the list and gives the focus back to the button", async () => {
    const { user, open } = setup();
    await open();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Tìm hoặc tạo nhãn" })).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Gán nhãn" }));
  });

  it("cannot be opened while the row is busy", () => {
    setup({ disabled: true });
    expect((screen.getByRole("button", { name: "Gán nhãn" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("invites to create the first label, and says so when the list could not be read", async () => {
    const first = setup({ labels: [] });
    await first.open();
    expect(screen.getByText(/Chưa có nhãn nào/)).toBeTruthy();
  });

  it("says the label list could not be read instead of 'no label yet'", async () => {
    const { open } = setup({ labels: [], unavailable: true });
    await open();
    expect(screen.getByText(/Không tải được danh sách nhãn/)).toBeTruthy();
  });
});
