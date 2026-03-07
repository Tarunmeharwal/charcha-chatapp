"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMeAPI, logoutAPI } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    const fetchUser = useCallback(async () => {
        try {
            const data = await getMeAPI();
            if (data._id) {
                setUser(data);
                connectSocket(data._id);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const savedToken = localStorage.getItem("charcha_token");
        if (savedToken) setToken(savedToken);

        fetchUser();
    }, [fetchUser]);

    const login = (userData) => {
        localStorage.setItem("charcha_token", userData.token);
        setToken(userData.token);
        setUser(userData);
        connectSocket(userData._id);
    };

    const logout = async () => {
        try {
            await logoutAPI();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("charcha_token");
            setToken(null);
            setUser(null);
            disconnectSocket();
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, token, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
}
