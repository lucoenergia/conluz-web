import '@testing-library/jest-dom'
import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ForgotPassword } from './ForgotPassword'
import { BrowserRouter } from 'react-router'

test('Renders ForgotPassword content', async () => {
    render(<BrowserRouter><ForgotPassword/></BrowserRouter>)
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
    expect(screen.getByText('Introduce tu email y te enviaremos instrucciones para restaurar tu contraseña')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe aquí tu email')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
})
