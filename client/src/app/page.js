"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/chat");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="auth-container">
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto" }}></div>
        <p style={{ marginTop: 16, color: "var(--text-secondary)" }}>Loading Charcha...</p>
      </div>
    </div>
  );
}
