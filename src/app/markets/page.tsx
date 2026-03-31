import { redirect } from "next/navigation";

/** Markets content lives on the Dashboard under the Markets tab. */
export default function MarketsRedirectPage() {
  redirect("/?tab=markets");
}
