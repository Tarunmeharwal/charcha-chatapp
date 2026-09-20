"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signupAPI, checkUsernameAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    // New states for enhancements
    const [usernameStatus, setUsernameStatus] = useState(null); // 'checking', 'available', 'taken'
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "" });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            router.replace("/chat");
        }
    }, [user, authLoading, router]);

    // Handle Username Check (Debounced)
    useEffect(() => {
        const checkUsername = async () => {
            if (formData.username.length < 3) {
                setUsernameStatus(null);
                return;
            }
            setUsernameStatus("checking");
            try {
                const data = await checkUsernameAPI(formData.username);
                setUsernameStatus(data.available ? "available" : "taken");
            } catch (err) {
                setUsernameStatus(null);
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);
    }, [formData.username]);

    // Handle Password Strength
    useEffect(() => {
        const pass = formData.password;
        if (!pass) {
            setPasswordStrength({ score: 0, label: "" });
            return;
        }

        let score = 0;
        if (pass.length >= 6) score++;
        if (pass.length >= 10) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        let label = "Weak";
        let colorClass = "weak";
        if (score >= 4) {
            label = "Strong";
            colorClass = "strong";
        } else if (score >= 2) {
            label = "Medium";
            colorClass = "medium";
        }

        setPasswordStrength({ score, label, colorClass });
    }, [formData.password]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.username || !formData.email || !formData.password) {
            setError("Please fill all fields");
            return;
        }

        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }

        if (usernameStatus === "taken") {
            setError("Username is already taken");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            const data = await signupAPI({
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });

            if (data.token) {
                login(data);
                router.push("/chat");
            } else {
                setError(data.message || "Signup failed");
            }
        } catch (err) {
            setError("Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };

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
            <div className="relative z-10 w-full md:w-1/2 flex flex-col justify-start px-8 sm:px-8 md:px-10 lg:px-12 xl:px-16 pt-10 lg:pt-16 pb-24 min-h-screen">
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-5xl font-medium text-[#d8c83a] mb-5 tracking-tight">Join Charcha</h1>
                    <div className="text-3xl sm:text-5xl font-light text-white tracking-tighter leading-tight">
                        <div>Spark meaningful</div>
                        <div className="mt-2">conversations instantly</div>
                    </div>
                </div>

                <div className="w-full max-w-[400px]">
                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                name="username"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={handleChange}
                                autoComplete="username"
                                className="w-full rounded-full px-6 py-3 sm:px-8 sm:py-4 bg-white text-gray-900 border-2 border-transparent focus:border-[#d8c83a] focus:outline-none placeholder-gray-500 font-medium text-base sm:text-lg shadow-lg transition-colors"
                            />
                            {usernameStatus && (
                                <div className={`text-xs mt-2 ml-4 font-semibold ${usernameStatus === 'available' ? 'text-green-400' :
                                    usernameStatus === 'taken' ? 'text-red-300' : 'text-white/70'
                                    }`}>
                                    {usernameStatus === "checking" && <span>Checking availability...</span>}
                                    {usernameStatus === "available" && <span>Username available</span>}
                                    {usernameStatus === "taken" && <span>Username already taken</span>}
                                </div>
                            )}
                        </div>

                        <div>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={handleChange}
                                autoComplete="email"
                                className="w-full rounded-full px-6 py-3 sm:px-8 sm:py-4 bg-white text-gray-900 border-2 border-transparent focus:border-[#d8c83a] focus:outline-none placeholder-gray-500 font-medium text-base sm:text-lg shadow-lg transition-colors"
                            />
                        </div>

                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    placeholder="Create a password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    className="w-full rounded-full px-6 py-3 sm:px-8 sm:py-4 bg-white text-gray-900 border-2 border-transparent focus:border-[#d8c83a] focus:outline-none placeholder-gray-500 font-medium text-base sm:text-lg shadow-lg transition-colors pr-12"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex="-1"
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {formData.password && (
                                <div className="mt-2 ml-4">
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden max-w-[150px]">
                                        <div
                                            className={`h-full transition-all duration-300 ${passwordStrength.colorClass === 'weak' ? 'bg-red-400 w-1/3' :
                                                passwordStrength.colorClass === 'medium' ? 'bg-[#d8c83a] w-2/3' :
                                                    'bg-[#4ade80] w-full'
                                                }`}
                                        ></div>
                                    </div>
                                    <span className={`text-[11px] mt-1 font-semibold inline-block ${passwordStrength.colorClass === 'weak' ? 'text-red-300' :
                                        passwordStrength.colorClass === 'medium' ? 'text-[#d8c83a]' :
                                            'text-[#4ade80]'
                                        }`}>
                                        {passwordStrength.label} Password
                                    </span>
                                </div>
                            )}
                        </div>



                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-6 sm:py-4 sm:px-8 bg-[#d8c83a] hover:bg-[#c6b631] text-[#320073] rounded-full font-bold text-base sm:text-lg shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? "Creating account..." : "Sign Up"}
                        </button>
                    </form>

                    <div className="mt-8">
                        <p className="text-white/80 text-base font-medium">
                            Already have an account?{" "}
                            <Link href="/login" className="text-[#d8c83a] hover:text-[#FEF08A] hover:underline underline-offset-4 font-bold">
                                Log in
                            </Link>
                        </p>
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
