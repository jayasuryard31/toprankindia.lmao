import { useQuery } from "@tanstack/react-query";
import { getHome } from "../services/productsApi";

export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: getHome,
    staleTime: 30000,
  });
}
