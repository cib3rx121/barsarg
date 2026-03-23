import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireConsultaSession() {
  const session = (await cookies()).get("barsarg_consulta_session")?.value;
  if (session !== "ok") {
    redirect("/consulta");
  }
}
