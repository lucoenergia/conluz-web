"use client";

import { redirect } from "next/navigation";

export default function Home({}) {
  redirect("/modules/dashboard");
}
