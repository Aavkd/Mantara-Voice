import { auth } from "@/auth";
import MantaraApp from "./mantara-app";

export default async function Home() {
  const session = await auth();

  return (
    <MantaraApp
      initialUser={
        session?.user?.id
          ? {
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email ?? null,
            }
          : null
      }
    />
  );
}
