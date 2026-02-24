"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type MobileHeaderTitleContextType = {
  title: string;
  setTitle: (title: string) => void;
};

const MobileHeaderTitleContext = createContext<MobileHeaderTitleContextType>({
  title: "",
  setTitle: () => {},
});

export function MobileHeaderTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const value = useMemo(() => ({ title, setTitle }), [title]);
  return (
    <MobileHeaderTitleContext.Provider value={value}>
      {children}
    </MobileHeaderTitleContext.Provider>
  );
}

export function useMobileHeaderTitle() {
  return useContext(MobileHeaderTitleContext);
}
