import { afterEach, describe, expect, it, vi } from "vitest";
import { triggerBrowserDownload } from "./triggerBrowserDownload";

describe("triggerBrowserDownload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("saves the blob under the filename, and leaves no anchor or object URL behind", () => {
    const blob = new Blob(["TEST-CONTENT"], { type: "text/plain" });
    // jsdom has no createObjectURL/revokeObjectURL implementation.
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const clicked: { href: string; download: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, attached: document.body.contains(this) });
    });

    triggerBrowserDownload(blob, "TEST-FILE.txt");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([{ href: "blob:test", download: "TEST-FILE.txt", attached: true }]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(document.querySelector("a")).toBeNull();
  });
});
