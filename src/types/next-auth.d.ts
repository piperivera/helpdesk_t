import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "requester" | "resolver" | "admin";
      area?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "requester" | "resolver" | "admin";
    area?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    area?: string;
  }
}
