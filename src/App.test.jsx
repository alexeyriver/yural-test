import { render, screen } from '@testing-library/react'
import App from './App.jsx'

test('renders page title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Поиск автозапчастей' })).toBeInTheDocument()
})
