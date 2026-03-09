"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";

export default function ChatPage() {
    const { user, loading } = useAuth();
    const { selectedChat, setSelectedChat } = useChat();
    const router = useRouter();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        const setAppHeight = () => {
            const viewportHeight = window.visualViewport?.height || window.innerHeight;
            document.documentElement.style.setProperty("--app-height", `${viewportHeight}px`);
        };

        setAppHeight();
        window.addEventListener("resize", setAppHeight);
        window.addEventListener("orientationchange", setAppHeight);
        window.visualViewport?.addEventListener("resize", setAppHeight);

        return () => {
            window.removeEventListener("resize", setAppHeight);
            window.removeEventListener("orientationchange", setAppHeight);
            window.visualViewport?.removeEventListener("resize", setAppHeight);
        };
    }, []);

    // Handle browser back button on mobile
    useEffect(() => {
        if (isMobile && selectedChat) {
            // Push a dummy state to history so we can catch the back button
            window.history.pushState({ chatOpen: true }, "");
        }
    }, [selectedChat, isMobile]);

    useEffect(() => {
        const handlePopState = (e) => {
            if (isMobile && selectedChat) {
                // If the user clicks back, just close the chat
                setSelectedChat(null);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [isMobile, selectedChat, setSelectedChat]);

    if (loading) {
        return (
            <div className="auth-container">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className={`chat-app ${selectedChat ? "chat-open" : ""}`}>
            <Sidebar />
            <ChatWindow isMobile={isMobile} />
        </div>
    );
}
