import '@testing-library/jest-dom'
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ForgotPassword } from './ForgotPassword'
import { BrowserRouter } from 'react-router'

test('Renders ForgotPassword content', async () => {
    render(<BrowserRouter><ForgotPassword/></BrowserRouter>)
    expect(screen.getByText('¿No recuerdas tu contraseña?')).toBeInTheDocument();
    expect(screen.getByText('Introduce tu DNI y te enviaremos un correo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe aquí tu DNI/NIF')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
})