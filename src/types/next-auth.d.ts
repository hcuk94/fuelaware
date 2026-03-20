import { UserRole } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      email?: string | null;
      name?: string | null;
    };
  }

  interface User {
    role?: UserRole;
  }
}
