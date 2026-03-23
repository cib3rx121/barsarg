import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAdminSession() {
  const session = (await cookies()).get("barsarg_admin_session")?.value;
  if (session !== "ok") {
    redirect("/admin/login");
  }
}
