"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy } from "lucide-react";

export default function PasswordInput({ value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? "border-red-500 pr-20" : "pr-20"}
      />

      {/* Toggle */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {/* Copy */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>

      {copied && <p className="text-xs text-green-500 mt-1">Copied!</p>}
    </div>
  );
}
