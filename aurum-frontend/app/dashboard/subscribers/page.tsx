import { redirect } from "next/navigation";

export default function SubscribersRedirect() {
  redirect("/dashboard/subscriber");
}
