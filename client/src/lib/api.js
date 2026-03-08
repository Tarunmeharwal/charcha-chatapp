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
        credentials: "include",
    });
    return res.json();
};

export const checkUsernameAPI = async (username) => {
    const res = await fetch(`${API_URL}/auth/check-username/${username}`);
    return res.json();
};

export const loginAPI = async (data) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
    });
    return res.json();
};

export const getMeAPI = async () => {
    const res = await fetch(`${API_URL}/auth/me`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const logoutAPI = async (data) => {
    const res = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

// User APIs
export const searchUsersAPI = async (query) => {
    const res = await fetch(`${API_URL}/users/search?q=${query}`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const getSuggestionsAPI = async () => {
    const res = await fetch(`${API_URL}/users/suggestions`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const sendFriendRequestAPI = async (userId) => {
    const res = await fetch(`${API_URL}/users/friend-request/${userId}`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const respondFriendRequestAPI = async (requestId, action) => {
    const res = await fetch(`${API_URL}/users/friend-request/${requestId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ action }),
        credentials: "include",
    });
    return res.json();
};

export const getFriendRequestsAPI = async () => {
    const res = await fetch(`${API_URL}/users/friend-requests`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const getFriendsAPI = async () => {
    const res = await fetch(`${API_URL}/users/friends`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const updateProfileAPI = async (data) => {
    const res = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
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
        credentials: "include",
    });
    return res.json();
};

export const removeProfileAvatarAPI = async () => {
    const res = await fetch(`${API_URL}/users/profile/avatar`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

// Chat APIs
export const accessChatAPI = async (userId) => {
    const res = await fetch(`${API_URL}/chats`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId }),
        credentials: "include",
    });
    return res.json();
};

export const getChatsAPI = async () => {
    const res = await fetch(`${API_URL}/chats`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const createGroupChatAPI = async (data) => {
    const res = await fetch(`${API_URL}/chats/group`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
    });
    return res.json();
};

export const clearChatAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/chats/${chatId}/clear`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const deleteChatAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/chats/${chatId}`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

// Message APIs
export const sendMessageAPI = async (data) => {
    const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
    });
    return res.json();
};

export const sendMediaMessageAPI = async (formData) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/messages/media`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        credentials: "include",
    });
    return res.json();
};

export const getMessagesAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/messages/${chatId}`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const markAsReadAPI = async (chatId) => {
    const res = await fetch(`${API_URL}/messages/read/${chatId}`, {
        method: "PUT",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const reactToMessageAPI = async (messageId, emoji) => {
    const res = await fetch(`${API_URL}/messages/reaction/${messageId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ emoji }),
        credentials: "include",
    });
    return res.json();
};

export const removeReactionAPI = async (messageId) => {
    const res = await fetch(`${API_URL}/messages/reaction/${messageId}`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const unsendMessageAPI = async (messageId) => {
    const res = await fetch(`${API_URL}/messages/unsend/${messageId}`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const deleteForMeAPI = async (messageId) => {
    const res = await fetch(`${API_URL}/messages/${messageId}/delete-for-me`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

// Status APIs
export const createStatusAPI = async (data) => {
    const res = await fetch(`${API_URL}/status`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
        credentials: "include",
    });
    return res.json();
};

export const getStatusesAPI = async () => {
    const res = await fetch(`${API_URL}/status`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const getMyStatusesAPI = async () => {
    const res = await fetch(`${API_URL}/status/me`, {
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const viewStatusAPI = async (statusId) => {
    const res = await fetch(`${API_URL}/status/view/${statusId}`, {
        method: "PUT",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const deleteStatusAPI = async (statusId) => {
    const res = await fetch(`${API_URL}/status/${statusId}`, {
        method: "DELETE",
        headers: getHeaders(),
        credentials: "include",
    });
    return res.json();
};

export const createMediaStatusAPI = async (file, caption = "") => {
    const token = getToken();
    const formData = new FormData();
    formData.append("media", file);
    if (caption) formData.append("caption", caption);

    const res = await fetch(`${API_URL}/status/media`, {
        method: "POST",
        headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
        credentials: "include",
    });
    return res.json();
};
