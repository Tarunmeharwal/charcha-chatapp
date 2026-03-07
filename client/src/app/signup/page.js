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
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    // New states for enhancements
    const [usernameStatus, setUsernameStatus] = useState(null); // 'checking', 'available', 'taken'
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
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
            <div className="auth-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <h1>💬 Charcha</h1>
                    <p>Create your account</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            name="username"
                            placeholder="Choose a unique username"
                            value={formData.username}
                            onChange={handleChange}
                            autoComplete="username"
                        />
                        {usernameStatus && (
                            <div className={`username-status ${usernameStatus}`}>
                                {usernameStatus === "checking" && <span>Checking...</span>}
                                {usernameStatus === "available" && <span>✅ Available</span>}
                                {usernameStatus === "taken" && <span>❌ Already taken</span>}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                        {formData.password && (
                            <>
                                <div className="strength-meter">
                                    <div className={`strength-bar ${passwordStrength.colorClass}`}></div>
                                </div>
                                <span className={`strength-text ${passwordStrength.colorClass}`}>
                                    {passwordStrength.label}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                            </button>
                        </div>
                    </div>

                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <p className="auth-link">
                    Already have an account? <Link href="/login">Log in</Link>
                </p>
            </div>
        </div>
    );
}
