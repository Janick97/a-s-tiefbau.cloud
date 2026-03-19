import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

// Speichert Scroll-Positionen pro URL
const scrollPositions = {};

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];
    const prevKeyRef = useRef(null);

    // Scroll-Position speichern bevor die Route wechselt, und wiederherstellen danach
    useEffect(() => {
        const key = location.key;
        const scrollContainer = document.querySelector('main .flex-1.overflow-auto') || document.documentElement;

        // Scroll-Position der vorherigen Seite speichern
        if (prevKeyRef.current && prevKeyRef.current !== key) {
            // Nichts tun – Speicherung passiert im cleanup
        }

        // Scroll-Position für aktuelle Seite wiederherstellen (bei Zurück-Navigation)
        const saved = scrollPositions[key];
        if (saved !== undefined) {
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = saved;
            });
        } else {
            // Neue Seite → nach oben scrollen
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = 0;
            });
        }

        prevKeyRef.current = key;

        // Beim Verlassen der Seite aktuelle Position speichern
        return () => {
            scrollPositions[key] = scrollContainer.scrollTop;
        };
    }, [location.key]);

    // Post navigation changes to parent window
    useEffect(() => {
        window.parent?.postMessage({
            type: "app_changed_url",
            url: window.location.href
        }, '*');
    }, [location]);

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;
        
        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            
            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );
            
            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            base44.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}