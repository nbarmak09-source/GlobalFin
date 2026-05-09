import type { Metadata } from "next"
import { FUND_LETTERS } from "@/lib/fundLetters"
import FundLettersArchiveClient from "./FundLettersArchiveClient"

export const metadata: Metadata = {
  title: "Fund Letters Archive | Capital Markets Hub",
  description: "Curated quarterly letters from top hedge funds and investment firms.",
}

export default function FundLettersPage() {
  return <FundLettersArchiveClient letters={FUND_LETTERS} />
}
