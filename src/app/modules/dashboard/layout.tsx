// ** Layout Import
import UserLayout from "@/app/layouts/UserLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UserLayout>{children}</UserLayout>;
}
