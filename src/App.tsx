import './App.css'
import { Route, Routes } from 'react-router'
import { AuthenticatedLayout } from './layouts/authenticated.layout'
import ContactPage from './pages/contact/Contact.page'
import { LoginLayout } from './layouts/login.layout'
import { Login } from './components/login/login'
import { ForgotPassword } from './components/ForgotPassword/ForgotPassword'
import { NewPassword } from './components/NewPassword/NewPassword'

function App() {

  return (
    <>
      <Routes>
        <Route element={<LoginLayout/>}>
          <Route path='login' element={<Login/>}></Route>
          <Route path='forgotpassword' element={<ForgotPassword/>}></Route>
          <Route path='newpassword' element={<NewPassword/>}></Route>
        </Route> 
        <Route element={<AuthenticatedLayout/>}>
          <Route index />
          <Route path="contact" element={<ContactPage />}/> 
        </Route>
      </Routes>
    </>
)}

export default App
