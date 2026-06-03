"use client";

import { Copy } from "lucide-react";

export function CopyCodeButton({ code }: { code: string }) {
  return (
    <button
      className="gallery-button-secondary"
      type="button"
      onClick={() => navigator.clipboard.writeText(code)}
    >
      <Copy size={16} /> 코드 복사
    </button>
  );
}
