import { useQuery } from "@tanstack/react-query";
import { getStats } from "../services/statsApi";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 30000,
  });
}
