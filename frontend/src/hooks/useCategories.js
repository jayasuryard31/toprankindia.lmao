import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../services/categoriesApi";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 60000,
  });
}
