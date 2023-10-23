import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'

import { GlobalContextProvider } from './context/GlobalContext'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalContextProvider>
      <ChakraProvider>
        <App />
      </ChakraProvider>
    </GlobalContextProvider>
  </React.StrictMode>,
)
