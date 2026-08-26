import { useState } from 'react'
import { addNumbers } from '../api'
import './App.css'

function App() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    try {
      const data = await addNumbers(Number(a), Number(b))
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <h1 class="text-3xl font-bold underline">
        Hello world!
      </h1>

      <form onSubmit={handleSubmit}>
        <input type="number" value={a} onChange={(e) => setA(e.target.value)} placeholder="a" required />
        <input type="number" value={b} onChange={(e) => setB(e.target.value)} placeholder="b" required />
        <button type="submit">Add</button>
      </form>

      {result !== null && <p>Result: {result}</p>}
      {error && <p>Error: {error}</p>}
    </>
  )
}

export default App
