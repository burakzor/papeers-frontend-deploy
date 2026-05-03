import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import { getWsBaseUrl } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';

export type BackendNotificationType =
    | 'ASSIGNMENT_RECEIVED'
    | 'REVIEWER_REMOVED'
    | 'REVIEWER_INVITATION_ACCEPTED'
    | 'REVIEWER_INVITATION_REJECTED'
    | 'REVIEW_FINISHED'
    | 'ALL_REVIEWS_COMPLETED'
    | 'DECISION_MADE'
    | 'DEADLINE_REMINDER'
    | 'DEADLINE_EXPIRED'
    | 'DEADLINE_EXTENSION_REQUEST'
    | 'DEADLINE_EXTENSION_APPROVED'
    | 'DEADLINE_EXTENSION_REJECTED'
    | 'COORDINATOR_EXTENDED_DEADLINE'
    | 'GUEST_ACCESS_GRANTED'
    | 'NEW_PAPER_UPLOADED'
    | 'WELCOME_TO_LAB'
    | 'ASSIGNMENT_CANCELLED'
    | 'SYSTEM_ALERT'
    | 'CLARIFICATION_REQUESTED'
    | 'CLARIFICATION_FINISHED'
    | null;

export interface NotificationResponseDTO {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    date: string;
    type: BackendNotificationType;
}

interface NotificationContextType {
    unreadCount: number;
    resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const TYPE_PATHS: Partial<Record<NonNullable<BackendNotificationType>, { coordinator: string; member: string }>> = {
    ASSIGNMENT_RECEIVED:           { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    REVIEWER_REMOVED:              { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    REVIEWER_INVITATION_ACCEPTED:  { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    REVIEWER_INVITATION_REJECTED:  { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    REVIEW_FINISHED:               { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    ALL_REVIEWS_COMPLETED:         { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    DECISION_MADE:                 { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    DEADLINE_REMINDER:             { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXPIRED:              { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_REQUEST:    { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_APPROVED:   { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    DEADLINE_EXTENSION_REJECTED:   { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    COORDINATOR_EXTENDED_DEADLINE: { coordinator: '/coordinator/deadlines', member: '/member/reviews' },
    GUEST_ACCESS_GRANTED:          { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    NEW_PAPER_UPLOADED:            { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    WELCOME_TO_LAB:                { coordinator: '/coordinator/papers',    member: '/member/submissions' },
    ASSIGNMENT_CANCELLED:          { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    CLARIFICATION_REQUESTED:       { coordinator: '/coordinator/papers',    member: '/member/reviews' },
    CLARIFICATION_FINISHED:        { coordinator: '/coordinator/papers',    member: '/member/submissions' },
};

function getToastVariant(type: BackendNotificationType): 'success' | 'error' | 'warning' | 'info' {
    if (!type) return 'info';
    const successTypes: BackendNotificationType[] = [
        'ASSIGNMENT_RECEIVED', 'REVIEWER_INVITATION_ACCEPTED', 'ALL_REVIEWS_COMPLETED',
        'REVIEW_FINISHED', 'WELCOME_TO_LAB', 'GUEST_ACCESS_GRANTED', 'DEADLINE_EXTENSION_APPROVED',
        'CLARIFICATION_FINISHED',
    ];
    const errorTypes: BackendNotificationType[] = [
        'DEADLINE_EXPIRED', 'REVIEWER_REMOVED', 'ASSIGNMENT_CANCELLED', 'REVIEWER_INVITATION_REJECTED',
        'DEADLINE_EXTENSION_REJECTED',
    ];
    const warningTypes: BackendNotificationType[] = [
        'DEADLINE_REMINDER', 'DEADLINE_EXTENSION_REQUEST', 'CLARIFICATION_REQUESTED',
    ];
    if (successTypes.includes(type)) return 'success';
    if (errorTypes.includes(type)) return 'error';
    if (warningTypes.includes(type)) return 'warning';
    return 'info';
}

function getTargetPath(type: BackendNotificationType, role: string | undefined): string | null {
    if (!type) return null;
    const paths = TYPE_PATHS[type];
    if (!paths) return null;
    return role === 'coordinator' ? paths.coordinator : paths.member;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const seenIds = useRef(new Set<string>());

    const resetUnreadCount = () => setUnreadCount(0);

    useEffect(() => {
        if (!user?.id || !user?.token) return;

        const rawUrl = getWsBaseUrl();
        const wsUrl = rawUrl.startsWith('http') ? rawUrl.replace(/^http/, 'ws') : rawUrl;

        const client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${user.token}`,
            },
            reconnectDelay: 5000,
            onStompError: (frame) => console.error('STOMP error:', frame.headers['message']),

            onConnect: () => {
                const userIdStr = String(user.id).toLowerCase();

                client.subscribe(`/topic/notifications/${userIdStr}`, (frame) => {
                    const incoming = JSON.parse(frame.body) as NotificationResponseDTO;

                    // Deduplicate: skip if already shown (guards against double subscriptions)
                    if (seenIds.current.has(incoming.id)) return;
                    seenIds.current.add(incoming.id);

                    // 1. Optimistically prepend to the cached notification list (bell icon updates instantly)
                    queryClient.setQueryData<NotificationResponseDTO[]>(['notifications', user.id], (prev) => {
                        return [incoming, ...(prev ?? [])];
                    });

                    // 2. Increment unread badge count
                    setUnreadCount((c) => c + 1);

                    // 3. Show a colour-coded popup toast
                    const targetPath = getTargetPath(incoming.type, user.role);
                    const variant = getToastVariant(incoming.type);

                    const toastFn =
                        variant === 'success' ? toast.success
                        : variant === 'error'   ? toast.error
                        : variant === 'warning' ? toast.warning
                        : toast.info;

                    toastFn(incoming.title, {
                        description: incoming.message,
                        duration: 6000,
                        action: targetPath
                            ? { label: 'View', onClick: () => navigate(targetPath) }
                            : undefined,
                    });
                });
            },
        });

        client.activate();
        return () => { void client.deactivate(); };
    }, [user?.id, user?.token, user?.role, navigate, queryClient]);

    return (
        <NotificationContext.Provider value={{ unreadCount, resetUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};