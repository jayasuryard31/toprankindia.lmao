import { useQuery } from "@tanstack/react-query";
import { getCityLayout } from "../services/mapApi";
import { CITY_FALLBACK } from "../components/map/cityData";

export function useCityLayout() {
  return useQuery({
    queryKey: ["map", "city"],
    queryFn: getCityLayout,
    staleTime: Infinity,
    initialData: CITY_FALLBACK,
    placeholderData: CITY_FALLBACK,
  });
}
