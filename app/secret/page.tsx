import { Metadata } from "next";
import SecretPageClient from "./client";

export const metadata: Metadata = {
  title: "Pakde gaye! | Resume Roaster",
  description: "Beta, yeh page nahi tha tera. Apna resume fix kar pehle.",
};

export default function SecretPage() {
  return <SecretPageClient />;
}
