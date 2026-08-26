import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrder, verifyPayment } from "../services/paymentsApi";

export function usePayment() {
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  return {
    createOrder: createOrderMutation,
    verifyPayment: verifyPaymentMutation,
  };
}
