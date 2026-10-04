import { notFound } from "next/navigation";

/** Internal rewrite target. The address bar stays on the URL the visitor typed. */
export default function SecretMissingPage() {
  notFound();
}
