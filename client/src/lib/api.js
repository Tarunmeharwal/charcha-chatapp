const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("charcha_token") : null;

const getHeaders = () => {
    const token = getToken();
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

// Auth APIs
export const signupAPI = async (data) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const loginAPI = async (data) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getMeAPI = async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    return res.json();
};

// User APIs
export const searchUsersAPI = async (query) => {
    const res = await fetch(`${API_URL}/users/search?q=${query}`, {
        headers: getHeaders(),
    });
    return res.json();
};

export const sendFriendRequestAPI = async (userId) => {
    const res = await fetch(`${API_URL}/users/friend-request/${userId}`, {
        method: "POST",
        headers: getHeaders(),
    });
    return res.json();
};

export const respondFriendRequestAPI = async (requestId, action) => {
    const res = await fetch(`${API_URL}/users/friend-request/${requestId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ action }),
    });
    return res.json();
};

export const getFriendRequestsAPI = async () => {
    const res = await fetch(`${API_URL}/users/friend-requests`, {
        headers: getHeaders(),
    });
    return res.json();
};

export const getFriendsAPI = async () => {
    const res = await fetch(`${API_URL}/users/friends`, {
        headers: getHeaders(),
    });
    return res.json();
};

export const updateProfileAPI = async (data) => {
    const res = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
};

export const uploadProfileAvatarAPI = async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch(`${API_URL}/users/profile/avatar`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
    });
    return res.json();
};

export const removeProfileAvatarAPI = async () => {
    const res = await fetch(`${API_URL}/users/profile/avatar`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return res.json();
};

// Chat APIs
export const accessChatAPI = async (userId) => {
    const res = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
    });
    return res.json();
};

export const getChatsAPI = async () => {
    const res = await fetch(`${API_URL}/chats`, { headers: getHeaders() });
    return res.json();
};

export const createGroupChatAPI = async (data) => {
    const res = await fetch(`${API_URL}/chats/group`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
};

// Message APIs
export const sendMessageAPI = async (data) => {
    const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getMessagesAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/messages/${chatId}`, {
        headers: getHeaders(),
    });
    return res.json();
};

export const markAsReadAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/messages/read/${chatId}`, {
        method: "PUT",
        headers: getHeaders(),
    });
    return res.json();
};

export const reactToMessageAPI = async (messageId, emoji) => {
    const res = await fetch(`${API_URL}/messages/reaction/${messageId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ emoji }),
    });
    return res.json();
};

export const removeReactionAPI = async (messageId) => {
    const res = await fetch(`${API_URL}/messages/reaction/${messageId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return res.json();
};

export const unsendMessageAPI = async (messageId) => {
    const res = await fetch(`${API_URL}/messages/unsend/${messageId}`, {
        method: "PUT",
        headers: getHeaders(),
    });
    return res.json();
};

// Status APIs
export const createStatusAPI = async (data) => {
    const res = await fetch(`${API_URL}/status`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return res.json();
};

export const getStatusesAPI = async () => {
    const res = await fetch(`${API_URL}/status`, { headers: getHeaders() });
    return res.json();
};

export const getMyStatusesAPI = async () => {
    const res = await fetch(`${API_URL}/status/me`, { headers: getHeaders() });
    return res.json();
};

export const viewStatusAPI = async (statusId) => {
    const res = await fetch(`${API_URL}/status/view/${statusId}`, {
        method: "PUT",
        headers: getHeaders(),
    });
    return res.json();
};

export const deleteStatusAPI = async (statusId) => {
    const res = await fetch(`${API_URL}/status/${statusId}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    return res.json();
};
