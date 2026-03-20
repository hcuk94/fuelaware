import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase();
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  pages: {
    signIn: "/"
  },
  providers: [
    Nodemailer({
      from: process.env.EMAIL_FROM ?? "FuelAware <no-reply@example.com>",
      server: process.env.SMTP_HOST
        ? {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            auth: process.env.SMTP_USER
              ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS
                }
              : undefined,
            secure: (process.env.SMTP_SECURE ?? "false") === "true"
          }
        : {
            jsonTransport: true
          }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const settings = await getSettings();
      const email = normalizeEmail(user.email);
      if (!email) return false;

      const adminEmail = normalizeEmail(settings.adminEmail);
      if (adminEmail && email === adminEmail) {
        const existingAdmin = await prisma.user.findFirst({
          where: { role: "ADMIN" }
        });

        if (existingAdmin && existingAdmin.email !== email) {
          await prisma.user.update({
            where: { id: existingAdmin.id },
            data: { email, role: "ADMIN", emailVerified: existingAdmin.emailVerified ?? new Date() }
          });
        } else if (!existingAdmin) {
          await prisma.user.upsert({
            where: { email },
            update: { role: "ADMIN", emailVerified: new Date() },
            create: { email, role: "ADMIN", emailVerified: new Date() }
          });
        }

        return true;
      }

      if (!settings.registrationEnabled) {
        const existing = await prisma.user.findUnique({ where: { email } });
        return Boolean(existing);
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    }
  }
};
