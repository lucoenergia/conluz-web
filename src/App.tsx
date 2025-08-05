import './App.css'
import { Route, Routes } from 'react-router'
import { AuthenticatedLayout } from './layouts/authenticated.layout'
import ContactPage from './pages/contact/Contact.page'
import { SupplyPointsPage } from './pages/supplyPointsPage/SupplyPointsPage'
import { LoginLayout } from './layouts/login.layout'
import { Login } from './pages/login/login'
import { ForgotPassword } from './pages/ForgotPassword/ForgotPassword'
import { NewPassword } from './pages/NewPassword/NewPassword'
import { SupplyDetailPage } from './pages/SupplyDetail/SupplyDetailPage'

function App() {
  return (
    <>
      <Routes>
        <Route element={<LoginLayout/>}>
          <Route path='login' element={<Login/>}></Route>
          <Route path='forgot-password'>
            <Route index element={<ForgotPassword/>}></Route>
            <Route path=':token' element={<NewPassword/>}></Route>
          </Route>
        </Route> 
        <Route element={<AuthenticatedLayout/>}>
          <Route index />
          <Route path='supply-points/'>
            <Route index element={<SupplyPointsPage/>}></Route>
            <Route path=':supplyPointId' element={<SupplyDetailPage/>}/>      
          </Route>    
          <Route path="contact" element={<ContactPage />}/> 
        </Route>
      </Routes>
    </>
)}

export default App
