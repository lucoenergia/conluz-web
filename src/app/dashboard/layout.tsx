"use client";

// ** Layout Import
import MainLayout from "@/app/shared/layouts/main/MainLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
