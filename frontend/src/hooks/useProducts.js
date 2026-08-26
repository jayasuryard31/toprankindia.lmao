import { useQuery } from "@tanstack/react-query";
import { getProducts, getTopProducts, getProduct } from "../services/productsApi";

export function useProducts(params) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
    staleTime: 15000,
  });
}

export function useTopProducts(limit = 3) {
  return useQuery({
    queryKey: ["products", "top", limit],
    queryFn: () => getTopProducts(limit),
    staleTime: 30000,
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: !!id,
    staleTime: 15000,
  });
}
