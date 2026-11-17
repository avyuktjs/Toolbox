import type { Metadata } from "next";
import { HistoryPage } from "@/features/history/history-page";

export const metadata: Metadata = {
  title: "History",
  description:
    "Everything Toolbox has processed, remembered locally: filename, format, size, date — and honest labels when the temporary file is already gone.",
};

export default function History() {
  return <HistoryPage />;
}
