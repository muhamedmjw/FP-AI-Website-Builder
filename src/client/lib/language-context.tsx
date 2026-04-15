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

type LanguageContextValue = {
	language: AppLanguage;
	setLanguage: (lang: AppLanguage) => void;
};

type LanguageProviderProps = {
	children: React.ReactNode;
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

export function LanguageProvider({
	children,
}: LanguageProviderProps) {
	const [language, setLanguageState] = useState<AppLanguage>("en");

	useEffect(() => {
		const initial = getInitialLanguage();
		if (initial !== "en") {
			setLanguageState(initial);
		}
	}, []);
	const isFirstLanguageEffect = useRef(true);

	const applyDocumentLanguageState = useCallback((nextLanguage: AppLanguage) => {
		const isRtl = RTL_LANGUAGES.includes(nextLanguage);
		document.documentElement.setAttribute("lang", nextLanguage);
		document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
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
