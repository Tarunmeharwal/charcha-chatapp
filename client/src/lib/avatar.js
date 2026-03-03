export const getInitials = (name) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
};

export const getIllustrationAvatar = (seed) => {
    const safeSeed = encodeURIComponent(seed || "charcha-user");
    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${safeSeed}&backgroundType=gradientLinear`;
};

const MALE_AVATAR_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
    id: `male-${i + 1}`,
    label: "male",
    url: `https://api.dicebear.com/9.x/adventurer/svg?seed=male-${i + 1}&backgroundType=gradientLinear`,
}));

const FEMALE_AVATAR_OPTIONS = Array.from({ length: 8 }, (_, i) => ({
    id: `female-${i + 1}`,
    label: "female",
    url: `https://api.dicebear.com/9.x/lorelei/svg?seed=female-${i + 1}&backgroundType=gradientLinear`,
}));

export const getAvatarLibrary = (category = "all") => {
    if (category === "male") return MALE_AVATAR_OPTIONS;
    if (category === "female") return FEMALE_AVATAR_OPTIONS;
    return [...MALE_AVATAR_OPTIONS, ...FEMALE_AVATAR_OPTIONS];
};

export const getAvatarSrc = (userOrName) => {
    if (!userOrName) return getIllustrationAvatar("charcha-user");

    if (typeof userOrName === "string") {
        return getIllustrationAvatar(userOrName);
    }

    if (userOrName.profilePic) {
        return userOrName.profilePic;
    }

    return getIllustrationAvatar(userOrName.username || userOrName.email || "charcha-user");
};
