import { redirect } from "next/navigation";

// The public "Book Now" CTA points here. Booking requires auth, so we route
// into the customer dashboard booking flow (which enforces login).
export default function BookRedirect() {
  redirect("/dashboard/book");
}
