import { z } from "zod";

export const meetingFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(160, "Title is too long"),
    description: z.string().trim().max(2000, "Description is too long"),
    projectId: z.string().optional(),
    participantIds: z.array(z.string()),
    date: z.string().min(1, "Date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    notes: z.string().trim().max(4000, "Notes are too long"),
    meetingLink: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]).optional(),
  })
  .refine((data) => `${data.date}T${data.endTime}` > `${data.date}T${data.startTime}`, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type MeetingFormValues = z.infer<typeof meetingFormSchema>;
