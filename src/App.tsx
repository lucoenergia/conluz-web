import './App.css'
import { Route, Routes } from 'react-router'
import { AuthenticatedLayout } from './layouts/authenticated.layout'
import ContactPage from './pages/contact/Contact.page'
import { SupplyPointsPage } from './components/supplyPointsPage/SupplyPointsPage'

function App() {

  return (
    <>
      <Routes>
        <Route element={<AuthenticatedLayout/>}>
          <Route path='supply-points' element={<SupplyPointsPage/>}/>          
          <Route path="contacto" element={<ContactPage />}/> 
        </Route>
      </Routes>
    </>
  )
}

export default App
