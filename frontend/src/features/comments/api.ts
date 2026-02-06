import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

export const commentSchema = z.object({
  id: z.string(),
  docId: z.string(),
  authorName: z.string(),
  fromPos: z.number(),
  toPos: z.number(),
  text: z.string(),
  resolved: z.boolean(),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

const commentsResponseSchema = z.object({
  comments: z.array(commentSchema),
});

const commentResponseSchema = z.object({
  comment: commentSchema,
});

export function useComments(docId?: string) {
  return useQuery({
    queryKey: ["comments", docId],
    enabled: Boolean(docId),
    queryFn: async () => {
      const response = await api.get(`/docs/${docId}/comments`);
      return commentsResponseSchema.parse(response.data).comments;
    },
  });
}

export function useAddComment() {
  return useMutation({
    mutationFn: async (input: {
      docId: string;
      authorName: string;
      fromPos: number;
      toPos: number;
      text: string;
    }) => {
      const response = await api.post(`/docs/${input.docId}/comments`, {
        authorName: input.authorName,
        fromPos: input.fromPos,
        toPos: input.toPos,
        text: input.text,
      });
      return commentResponseSchema.parse(response.data).comment;
    },
  });
}

export function useUpdateComment() {
  return useMutation({
    mutationFn: async (input: {
      docId: string;
      commentId: string;
      resolved?: boolean;
      text?: string;
    }) => {
      const response = await api.patch(
        `/docs/${input.docId}/comments/${input.commentId}`,
        {
          resolved: input.resolved,
          text: input.text,
        }
      );
      return commentResponseSchema.parse(response.data).comment;
    },
  });
}
