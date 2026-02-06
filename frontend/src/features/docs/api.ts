import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

const docSchema = z.object({
  id: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

export type Doc = z.infer<typeof docSchema>;

const createDocResponseSchema = docSchema;
const getDocResponseSchema = docSchema;
const updateDocResponseSchema = docSchema;

export function useCreateDoc() {
  return useMutation({
    mutationFn: async (input?: { title?: string }) => {
      const response = await api.post("/docs", input ?? {});
      return createDocResponseSchema.parse(response.data);
    },
  });
}

export function useDoc(id?: string) {
  return useQuery({
    queryKey: ["doc", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await api.get(`/docs/${id}`);
      return getDocResponseSchema.parse(response.data);
    },
  });
}

export function useUpdateDoc() {
  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const response = await api.patch(`/docs/${input.id}`,
        {
          title: input.title,
        }
      );
      return updateDocResponseSchema.parse(response.data);
    },
  });
}

export function useDeleteDoc() {
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const response = await api.delete(`/docs/${input.id}`);
      return response.data as { status: string };
    },
  });
}
