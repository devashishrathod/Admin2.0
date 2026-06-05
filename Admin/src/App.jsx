import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './features/auth/components/LoginPage'
// import LoginPage from './features/auth/components/LoginPage'




// import HomePage from './components/HomePage'   // aapka next page

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* "/" khulte hi LoginPage dikhega */}
   
           <Route path="/" element={<LoginPage />} />
          
        



        {/* koi bhi unknown route → Login pe bhejo */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App