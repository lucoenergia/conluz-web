import './App.css'
import { Route, Routes } from 'react-router'
import { AuthenticatedLayout } from './layouts/authenticated.layout'

function App() {

  return (
    <>
      <Routes>
        <Route index element={<AuthenticatedLayout/>}>
        </Route>
      </Routes>
    </>
  )
}

export default App
