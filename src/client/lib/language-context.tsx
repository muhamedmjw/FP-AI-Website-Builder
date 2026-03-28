"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { getSupabaseBrowserClient } from "@/client/lib/supabase-browser";
import { RTL_LANGUAGES } from "@/shared/constants/languages";
import type { AppLanguage } from "@/shared/types/database";

const STORAGE_KEY = "app-language";
const LANGUAGE_SYNC_EVENT = "app-language-change";
const RTL_FONT_LINK_ID = "rtl-fonts";
const RTL_FONT_LINK_HREF =
	"https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&display=swap";

function getUiFontStack(language: AppLanguage): string {
	if (language === "ku") {
		return '"KurdishUI", "Noto Sans Arabic", "Cairo", "Tajawal", sans-serif';
	}

	if (language === "ar") {
		return '"Cairo", sans-serif';
	}

	return 'var(--font-latin), "Segoe UI", "Helvetica Neue", Arial, sans-serif';
}

type LanguageContextValue = {
	language: AppLanguage;
	setLanguage: (lang: AppLanguage) => void;
};

type LanguageProviderProps = {
	children: React.ReactNode;
	initialLanguage?: AppLanguage;
	hasInitialLanguagePreference?: boolean;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): AppLanguage {
	if (typeof window === "undefined") return "en";

	try {
		const saved = window.localStorage.getItem(STORAGE_KEY) as AppLanguage | null;
		if (saved === "en" || saved === "ar" || saved === "ku") return saved;
	} catch {
		// Ignore localStorage access errors.
	}

	return "en";
}

function ensureRtlFontLink(language: AppLanguage) {
	const fontStack = getUiFontStack(language);
	document.documentElement.style.setProperty("--font-ui", fontStack);
	document.body.style.setProperty("--font-ui", fontStack);

	const applyUiFontOverride = () => {
		document.documentElement.style.setProperty("--font-ui", fontStack);
		document.body.style.setProperty("--font-ui", fontStack);
	};

	const existing = document.getElementById(RTL_FONT_LINK_ID);
	if (existing instanceof HTMLLinkElement) {
		if (existing.sheet) {
			applyUiFontOverride();
		} else {
			existing.addEventListener("load", applyUiFontOverride, { once: true });
		}
		return;
	}

	const link = document.createElement("link");
	link.id = RTL_FONT_LINK_ID;
	link.rel = "stylesheet";
	link.href = RTL_FONT_LINK_HREF;
	link.addEventListener("load", applyUiFontOverride, { once: true });
	document.head.appendChild(link);
}

function removeRtlFontLink() {
	const existing = document.getElementById(RTL_FONT_LINK_ID);
	if (existing) {
		existing.remove();
	}
}

export function LanguageProvider({
	children,
	initialLanguage,
	hasInitialLanguagePreference = false,
}: LanguageProviderProps) {
	const [language, setLanguageState] = useState<AppLanguage>(() => {
		const savedLanguage = getInitialLanguage();

		if (hasInitialLanguagePreference && initialLanguage && savedLanguage !== initialLanguage) {
			return initialLanguage;
		}

		return savedLanguage;
	});
	const isFirstLanguageEffect = useRef(true);

	const applyDocumentLanguageState = useCallback((nextLanguage: AppLanguage) => {
		const isRtl = RTL_LANGUAGES.includes(nextLanguage);
		document.documentElement.setAttribute("lang", nextLanguage);
		document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");

		// Always apply fonts to support text in all languages
		ensureRtlFontLink(nextLanguage);

		if (!isRtl) {
			removeRtlFontLink();
		}
	}, []);

	useEffect(() => {
		applyDocumentLanguageState(language);
	});

	useEffect(() => {
		function handleLanguageSync(event: Event) {
			const customEvent = event as CustomEvent<AppLanguage>;
			const nextLanguage = customEvent.detail;

			if (
				(nextLanguage === "en" || nextLanguage === "ar" || nextLanguage === "ku") &&
				nextLanguage !== language
			) {
				setLanguageState(nextLanguage);
			}
		}

		window.addEventListener(LANGUAGE_SYNC_EVENT, handleLanguageSync as EventListener);
		return () => {
			window.removeEventListener(LANGUAGE_SYNC_EVENT, handleLanguageSync as EventListener);
		};
	}, [language]);

	useEffect(() => {
		applyDocumentLanguageState(language);

		try {
			window.localStorage.setItem(STORAGE_KEY, language);
		} catch {
			// Ignore localStorage access errors.
		}

		if (isFirstLanguageEffect.current) {
			isFirstLanguageEffect.current = false;
			return;
		}

		async function persistUserPreference() {
			try {
				const supabase = getSupabaseBrowserClient();
				const {
					data: { user },
					error: userError,
				} = await supabase.auth.getUser();

				if (userError || !user) {
					return;
				}

				const { error: upsertError } = await supabase
					.from("user_preferences")
					.upsert(
						{
							user_id: user.id,
							language,
						},
						{ onConflict: "user_id" }
					);

				if (upsertError) {
					console.error("Failed to persist language preference:", upsertError);
				}
			} catch (error) {
				console.error("Failed to persist language preference:", error);
			}
		}

		void persistUserPreference();
	}, [applyDocumentLanguageState, language]);

	const setLanguage = useCallback((nextLanguage: AppLanguage) => {
		setLanguageState(nextLanguage);

		window.dispatchEvent(
			new CustomEvent<AppLanguage>(LANGUAGE_SYNC_EVENT, {
				detail: nextLanguage,
			})
		);
	}, []);

	const value = useMemo(
		() => ({ language, setLanguage }),
		[language, setLanguage]
	);

	return (
		<LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error("useLanguage must be used within a LanguageProvider.");
	}

	return context;
}
