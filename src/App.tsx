import './App.css'
import { Route, Routes } from 'react-router'
import { AuthenticatedLayout } from './layouts/authenticated.layout'
import ContactPage from './pages/contact/Contact.page'

function App() {

  return (
    <>
      <Routes>
        <Route element={<AuthenticatedLayout/>}>
          <Route index />
          <Route path="contacto" element={<ContactPage />}/> 
        </Route>
      </Routes>
    </>
  )
}

export default App
