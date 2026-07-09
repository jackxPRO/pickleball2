import { z } from "zod";

export const registerSchema = z
  .object({
    full_name: z.string().min(2, "Please enter your full name"),
    phone: z
      .string()
      .min(10, "Enter a valid mobile number")
      .regex(/^[0-9+\-\s]+$/, "Enter a valid mobile number"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const profileSchema = z.object({
  full_name: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Enter a valid mobile number"),
});

export const topupSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .min(50, "Minimum top-up is ₱50")
    .max(100000, "Maximum top-up is ₱100,000"),
});

export const bookingSchema = z.object({
  court_id: z.string().uuid("Select a court"),
  booking_date: z.string().min(1, "Select a date"),
  slots: z.array(z.string()).min(1, "Select at least one time slot"),
});

export const adjustWalletSchema = z.object({
  amount: z.number().refine((v) => v !== 0, "Amount cannot be zero"),
  description: z.string().min(2, "Add a short description"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type AdjustWalletInput = z.infer<typeof adjustWalletSchema>;
