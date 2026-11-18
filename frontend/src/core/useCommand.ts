import { useRef } from "react";
import { createCommandRunner } from "./client";

export function useCommand() {
  const runner = useRef<ReturnType<typeof createCommandRunner> | null>(null);
  if (!runner.current) runner.current = createCommandRunner();
  return runner.current;
}
