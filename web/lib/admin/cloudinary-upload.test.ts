import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadSignature } from "@/app/admin/actions";
import { uploadToCloudinary } from "./cloudinary-upload";

const signature: UploadSignature = {
  cloudName: "demo",
  apiKey: "key",
  timestamp: 123,
  folder: "accfenix",
  allowedFormats: "jpg,png",
  signature: "sig",
  maxImageBytes: 10,
  maxVideoBytes: 100,
};
const sign = async () => ({ ok: true as const, data: signature });

afterEach(() => vi.unstubAllGlobals());

describe("uploadToCloudinary", () => {
  it("sends every signed parameter and returns the stored file with its size", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/accfenix/a.png", public_id: "accfenix/a", resource_type: "image", width: 1080, height: 1920 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const up = await uploadToCloudinary(new File(["12345"], "a.png", { type: "image/png" }), sign);

    expect(up).toMatchObject({ public_id: "accfenix/a", resource_type: "image", width: 1080, height: 1920 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/auto/upload");
    const body = init.body as FormData;
    expect(Object.fromEntries([...body.entries()].filter(([k]) => k !== "file"))).toEqual({
      api_key: "key",
      timestamp: "123",
      folder: "accfenix",
      allowed_formats: "jpg,png",
      signature: "sig",
    });
  });

  it("rejects a file over the size limit before uploading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadToCloudinary(new File(["12345678901"], "big.png", { type: "image/png" }), sign)).rejects.toThrow("big.png");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the signature error", async () => {
    await expect(uploadToCloudinary(new File(["1"], "a.png"), async () => ({ ok: false as const, error: "Cloudinary no está configurado" }))).rejects.toThrow(
      "Cloudinary no está configurado",
    );
  });

  it("surfaces the Cloudinary error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { message: "Invalid image file" } }, { status: 400 })));

    await expect(uploadToCloudinary(new File(["1"], "a.png", { type: "image/png" }), sign)).rejects.toThrow("Invalid image file");
  });
});
