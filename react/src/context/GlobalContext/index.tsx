import React, { useState, createContext, useContext } from 'react';

interface GlobalContextData {
  contextWorking: string;
}

export const GlobalContext = createContext<GlobalContextData>({} as GlobalContextData)

export function GlobalContextProvider({children}: {children: React.ReactNode}) {
  const [contextWorking] = useState('!!!!!!!!!!!!!!!!Context is Working!');


  const providerValues = {
    contextWorking
  }

  return (
    <GlobalContext.Provider value={providerValues}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobal = () => {
  return useContext(GlobalContext);
};
