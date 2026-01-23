export interface User {
    id: number;
    name: string;
    email: string;
    username: string;
    phone: string;
    role: string;
    classType?: string; // e.g. "CMT", "PST" - inferred from classLevel usually
    classLevelId?: number; // The specific level they are in
    userId?: number; // Sometimes returned as 'userId' instead of 'id'
    classLevel?: string; // e.g. "CMT 4"
    createdAt?: string; // ISO date string
    created_at?: string;
    date_joined?: string;
}

export interface ClassLevel {
    id: number;
    name: string; // e.g. "PST 4"
    description?: string;
}

export interface Subject {
    id: number;
    name: string; // e.g. "PST 04101:DISPENSING"
    code?: string;
    classLevelId: number;
    semester: string; // e.g. "1"
    description?: string;
    image?: string;
}

export interface Banner {
    id: number;
    title?: string;
    name?: string;
    heading?: string;
    caption?: string;

    description?: string;
    content?: string;
    subtitle?: string;

    ctaText?: string; // Text for the button e.g. "Learn More"
    cta_text?: string;
    button_text?: string;

    imageUrl: string;
    link?: string; // URL to open when clicked
    targetUrl?: string; // API variant
}

export interface Material {
    id: number | string; // Backend might return string UUIDs
    title: string;
    type: 'note' | 'book' | 'video' | 'exam' | 'examGuide' | 'nactvet' | 'practical' | 'other';
    fileUrl?: string; // For PDFs
    videoUrl?: string; // For Videos
    subjectId: number; // Added for filtering
    accessStatus?: 'unlocked' | 'trial' | 'locked' | 'premium' | 'paid'; // New field from backend
    isLocked?: boolean; // Kept for backward compatibility
    fileType?: string;
}
