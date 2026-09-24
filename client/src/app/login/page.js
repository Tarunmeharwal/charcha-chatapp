"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { googleLoginAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/chat");
        }
    }, [user, authLoading, router]);

    const googleLoginTrigger = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError("");
            try {
                const data = await googleLoginAPI(tokenResponse.access_token);
                if (data.token) {
                    login(data);
                    router.push("/chat");
                } else {
                    setError(data.message || "Google Login failed");
                }
            } catch (err) {
                setError("Something went wrong with Google Login. Try again.");
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            setError("Google Login failed. Please try again.");
        }
    });

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#320073] flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-[#320073] flex font-dm selection:bg-[#d8c83a] selection:text-[#320073]">
            {/* Decorative Circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Outer Light Purple */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 md:top-1/2 md:bottom-auto md:left-auto md:right-0 md:translate-x-1/2 md:-translate-y-1/2 w-[500px] h-[500px] md:w-[110vw] md:h-[110vw] lg:w-[100vw] lg:h-[100vw] rounded-full bg-[#7E22CE] opacity-30 md:opacity-60"></div>
                {/* Middle Gold */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 md:top-1/2 md:bottom-auto md:left-auto md:right-0 md:translate-x-1/2 md:-translate-y-1/2 w-[350px] h-[350px] md:w-[80vw] md:h-[80vw] lg:w-[75vw] lg:h-[75vw] rounded-full bg-[#EAB308] opacity-40 md:opacity-70"></div>
                {/* Inner Yellow */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 md:top-1/2 md:bottom-auto md:left-auto md:right-0 md:translate-x-1/2 md:-translate-y-1/2 w-[200px] h-[200px] md:w-[50vw] md:h-[50vw] lg:w-[45vw] lg:h-[45vw] rounded-full bg-[#FEF08A] opacity-50 md:opacity-80"></div>
            </div>

            {/* Content Left */}
            <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-start px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 pt-10 sm:pt-14 lg:pt-16 pb-24 min-h-screen">
                <div className="mb-6 sm:mb-10">
                    <h1 className="text-4xl sm:text-[48px] font-medium text-[#d8c83a] mb-2 sm:mb-6 tracking-tight">Hello</h1>
                    <div className="text-4xl sm:text-[48px] font-light text-white tracking-tighter leading-none">
                        <div>Join the conversation</div>
                        <div>and connect instantly</div>
                    </div>
                </div>

                <div className="w-full max-w-[360px]">
                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="mt-4 w-full">
                        <button
                            type="button"
                            onClick={() => googleLoginTrigger()}
                            className="w-full flex items-center justify-center gap-4 py-5 px-6 bg-white hover:bg-gray-50 text-gray-800 rounded-full font-bold text-lg shadow-md transition-all duration-200 border border-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>


                </div>
            </div>

            {/* Bottom Logo */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:left-8 lg:left-12 xl:left-16 md:translate-x-0 z-10 flex items-center">
                <span className="text-[#d8c83a] md:text-[#d8c83a]/70 font-semibold text-3xl tracking-tight">charcha</span>
            </div>
        </div>
    );
}
